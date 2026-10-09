-- =====================================================================
-- Migración 08: Órdenes de pedido a proveedor y su recepción
-- Requerimientos: RF-09 (crear órdenes de pedido: administrador y vendedoras)
--                 RF-10 (recepción vinculada a la orden y a la factura del proveedor)
--                 RF-11 (comparar lo recibido contra lo pedido)
--
-- Flujo:
--   1. crear_orden_pedido: el administrador o una vendedora crea la orden
--      (serie PED) con productos y cantidades. Estado: pendiente.
--   2. recibir_orden_pedido: bodega registra lo que llegó. Crea una
--      ENTRADA DE COMPRA (serie ENT) ligada a la orden y actualiza lo recibido.
--      La orden pasa a "recibida_parcial" o "recibida".
--   3. Si se anula una recepción, la orden se recalcula sola (trigger).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipo: estado de una orden de pedido
-- ---------------------------------------------------------------------
create type public.estado_orden_pedido as enum ('pendiente', 'recibida_parcial', 'recibida', 'cancelada');

-- ---------------------------------------------------------------------
-- Tabla: ordenes_pedido (cabecera)
-- ---------------------------------------------------------------------
create table public.ordenes_pedido (
  id                 bigint generated always as identity primary key,
  anio               integer not null,
  correlativo        integer not null,
  -- Número visible, ej. PED-2026-00001
  numero             text generated always as ('PED-' || anio::text || '-' || lpad(correlativo::text, 5, '0')) stored,
  proveedor_id       bigint not null references public.proveedores (id),
  estado             public.estado_orden_pedido not null default 'pendiente',
  notas              text,
  motivo_cancelacion text,
  creado_por         uuid not null references public.perfiles (id),
  creado_en          timestamptz not null default now(),
  unique (anio, correlativo)
);

-- ---------------------------------------------------------------------
-- Tabla: detalle_orden_pedido (productos pedidos y lo recibido)
-- ---------------------------------------------------------------------
create table public.detalle_orden_pedido (
  id                 bigint generated always as identity primary key,
  orden_id           bigint  not null references public.ordenes_pedido (id),
  producto_id        bigint  not null references public.productos (id),
  cantidad           integer not null check (cantidad > 0),           -- pedido (unidad base)
  cantidad_recibida  integer not null default 0,                      -- se recalcula sola
  unique (orden_id, producto_id)
);

create index detalle_orden_pedido_orden_idx on public.detalle_orden_pedido (orden_id);

-- ---------------------------------------------------------------------
-- Documentos: nueva columna para ligar una entrada con su orden (RF-10)
-- ---------------------------------------------------------------------
alter table public.documentos
  add column orden_pedido_id bigint references public.ordenes_pedido (id);

create index documentos_orden_pedido_idx on public.documentos (orden_pedido_id);

-- ---------------------------------------------------------------------
-- Función interna: recalcular_orden_pedido
-- Suma lo recibido (entradas APROBADAS ligadas a la orden) por producto y
-- actualiza el estado de la orden (si no está cancelada).
-- ---------------------------------------------------------------------
create or replace function public.recalcular_orden_pedido(p_orden bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total     integer; -- líneas de la orden
  v_completas integer; -- líneas con todo recibido
  v_con_algo  integer; -- líneas con algo recibido
begin
  -- 1. Recibido por producto
  update public.detalle_orden_pedido dop
  set cantidad_recibida = coalesce((
    select sum(l.cantidad)
    from public.detalle_documento l
    join public.documentos d on d.id = l.documento_id
    where d.orden_pedido_id = p_orden
      and d.estado = 'aprobado'
      and l.producto_id = dop.producto_id
  ), 0)
  where dop.orden_id = p_orden;

  -- 2. Estado según lo recibido
  select count(*),
         count(*) filter (where cantidad_recibida >= cantidad),
         count(*) filter (where cantidad_recibida > 0)
  into v_total, v_completas, v_con_algo
  from public.detalle_orden_pedido
  where orden_id = p_orden;

  update public.ordenes_pedido
  set estado = case
                 when v_completas = v_total then 'recibida'
                 when v_con_algo > 0 then 'recibida_parcial'
                 else 'pendiente'
               end::public.estado_orden_pedido
  where id = p_orden and estado <> 'cancelada';
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: crear_orden_pedido · RF-09
-- p_lineas: [{"producto_id":1,"cantidad":40}, ...]  (unidad base)
-- Devuelve: id de la orden.
-- ---------------------------------------------------------------------
create or replace function public.crear_orden_pedido(
  p_proveedor bigint,
  p_lineas    jsonb,
  p_notas     text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id   bigint;
  v_anio integer := public.anio_actual();
begin
  perform public.exigir_rol('administrador', 'vendedora');

  if p_proveedor is null then
    raise exception 'Debe indicar el proveedor';
  end if;
  if p_lineas is null or jsonb_typeof(p_lineas) <> 'array' or jsonb_array_length(p_lineas) = 0 then
    raise exception 'La orden debe tener al menos un producto';
  end if;

  insert into public.ordenes_pedido (anio, correlativo, proveedor_id, notas, creado_por)
  values (v_anio, public.siguiente_correlativo('PED', v_anio), p_proveedor,
          nullif(trim(p_notas), ''), auth.uid())
  returning id into v_id;

  insert into public.detalle_orden_pedido (orden_id, producto_id, cantidad)
  select v_id, x.producto_id, x.cantidad
  from jsonb_to_recordset(p_lineas) as x(producto_id bigint, cantidad integer);

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: cancelar_orden_pedido
-- Solo órdenes pendientes (sin nada recibido). La puede cancelar el
-- administrador o la persona que la creó.
-- ---------------------------------------------------------------------
create or replace function public.cancelar_orden_pedido(p_orden bigint, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.exigir_rol('administrador', 'vendedora');

  if nullif(trim(p_motivo), '') is null then
    raise exception 'Debe indicar el motivo de la cancelación';
  end if;

  update public.ordenes_pedido
  set estado = 'cancelada', motivo_cancelacion = p_motivo
  where id = p_orden
    and estado = 'pendiente'
    and (public.rol_actual() = 'administrador' or creado_por = auth.uid());

  if not found then
    raise exception 'Solo se cancelan órdenes pendientes (sin recepciones), por el administrador o quien la creó';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: recibir_orden_pedido · RF-10, RF-11
-- Registra lo que llegó de una orden como ENTRADA DE COMPRA ligada a ella.
-- p_lineas: [{"producto_id":1,"cantidad":40}, ...]  (unidad base)
-- Solo se aceptan productos que estén en la orden.
-- Devuelve: id del documento de entrada.
-- ---------------------------------------------------------------------
create or replace function public.recibir_orden_pedido(
  p_orden               bigint,
  p_lineas              jsonb,
  p_documento_proveedor text,
  p_ubicacion           smallint
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orden     public.ordenes_pedido;
  v_documento bigint;
begin
  perform public.exigir_rol('jefe_bodega', 'administrador');

  select * into v_orden from public.ordenes_pedido where id = p_orden for update;
  if v_orden.id is null or v_orden.estado not in ('pendiente', 'recibida_parcial') then
    raise exception 'La orden no existe o ya no admite recepciones';
  end if;

  -- Todos los productos recibidos deben estar en la orden
  if exists (
    select 1
    from jsonb_to_recordset(p_lineas) as x(producto_id bigint, cantidad integer)
    where not exists (
      select 1 from public.detalle_orden_pedido
      where orden_id = p_orden and producto_id = x.producto_id
    )
  ) then
    raise exception 'Hay productos que no están en la orden. Regístrelos como entrada aparte.';
  end if;

  -- Crear la entrada de compra (valida cantidades, factura del proveedor, etc.)
  v_documento := public.crear_documento(
    'entrada_compra',
    (select jsonb_agg(jsonb_build_object(
              'producto_id', x.producto_id,
              'ubicacion_destino_id', p_ubicacion,
              'cantidad', x.cantidad))
     from jsonb_to_recordset(p_lineas) as x(producto_id bigint, cantidad integer)
     where x.cantidad > 0),
    jsonb_build_object(
      'proveedor_id', v_orden.proveedor_id,
      'documento_proveedor', p_documento_proveedor,
      'motivo', 'Recepción de ' || v_orden.numero)
  );

  -- Ligar la entrada a la orden y recalcular lo recibido
  update public.documentos set orden_pedido_id = p_orden where id = v_documento;
  perform public.recalcular_orden_pedido(p_orden);

  return v_documento;
end;
$$;

-- ---------------------------------------------------------------------
-- Trigger: si una recepción cambia de estado (por ejemplo, se anula),
-- recalcular su orden de pedido automáticamente.
-- ---------------------------------------------------------------------
create or replace function public.al_cambiar_estado_recepcion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.orden_pedido_id is not null and new.estado is distinct from old.estado then
    perform public.recalcular_orden_pedido(new.orden_pedido_id);
  end if;
  return new;
end;
$$;

create trigger recalcular_orden_al_cambiar_recepcion
  after update of estado on public.documentos
  for each row execute function public.al_cambiar_estado_recepcion();

-- ---------------------------------------------------------------------
-- Bitácora (RF-41)
-- ---------------------------------------------------------------------
create trigger bitacora_ordenes_pedido after insert or update or delete on public.ordenes_pedido
  for each row execute function public.registrar_bitacora();
create trigger bitacora_detalle_orden_pedido after insert or update or delete on public.detalle_orden_pedido
  for each row execute function public.registrar_bitacora();

-- ---------------------------------------------------------------------
-- Seguridad: todos con sesión ven las órdenes (vendedoras, bodega, admin).
-- Las escrituras se hacen solo con las funciones de arriba.
-- ---------------------------------------------------------------------
alter table public.ordenes_pedido       enable row level security;
alter table public.detalle_orden_pedido enable row level security;

create policy "leer ordenes de pedido" on public.ordenes_pedido for select to authenticated using (true);
create policy "leer detalle de pedido" on public.detalle_orden_pedido for select to authenticated using (true);

revoke execute on function public.recalcular_orden_pedido(bigint)                         from public, anon, authenticated;
revoke execute on function public.al_cambiar_estado_recepcion()                           from public, anon, authenticated;
revoke execute on function public.crear_orden_pedido(bigint, jsonb, text)                 from public, anon;
revoke execute on function public.cancelar_orden_pedido(bigint, text)                     from public, anon;
revoke execute on function public.recibir_orden_pedido(bigint, jsonb, text, smallint)     from public, anon;

grant execute on function public.crear_orden_pedido(bigint, jsonb, text)                  to authenticated;
grant execute on function public.cancelar_orden_pedido(bigint, text)                      to authenticated;
grant execute on function public.recibir_orden_pedido(bigint, jsonb, text, smallint)      to authenticated;