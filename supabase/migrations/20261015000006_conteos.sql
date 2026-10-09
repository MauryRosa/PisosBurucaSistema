-- =====================================================================
-- Migración 06: Conteos físicos y ajustes
-- Requerimiento: RF-37 (conteo físico total o por categoría que compara
--                contra el sistema y genera ajustes aprobados)
--
-- Flujo:
--   1. iniciar_conteo: toma una "foto" del stock del sistema de una ubicación
--      (todos los productos o una categoría).
--   2. guardar_cantidad_contada: bodega anota lo que contó físicamente.
--   3. cerrar_conteo: compara contado vs sistema y genera UN documento de
--      AJUSTE con las diferencias. El ajuste queda PENDIENTE hasta que el
--      administrador lo apruebe (en "Mermas y otros").
--   * Regla operativa: no registrar movimientos en esa ubicación mientras
--     el conteo esté abierto (la comparación usa la foto inicial).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipo: estado de un conteo
-- ---------------------------------------------------------------------
create type public.estado_conteo as enum ('abierto', 'cerrado', 'cancelado');

-- ---------------------------------------------------------------------
-- Tabla: conteos (cabecera)
-- ---------------------------------------------------------------------
create table public.conteos (
  id                   bigint generated always as identity primary key,
  ubicacion_id         smallint not null references public.ubicaciones (id),
  categoria            text,                                   -- null = conteo total
  notas                text,
  estado               public.estado_conteo not null default 'abierto',
  documento_ajuste_id  bigint references public.documentos (id), -- ajuste generado al cerrar
  creado_por           uuid not null references public.perfiles (id),
  creado_en            timestamptz not null default now(),
  cerrado_en           timestamptz
);

-- ---------------------------------------------------------------------
-- Tabla: detalle_conteo (una línea por producto)
-- ---------------------------------------------------------------------
create table public.detalle_conteo (
  id                bigint generated always as identity primary key,
  conteo_id         bigint  not null references public.conteos (id),
  producto_id       bigint  not null references public.productos (id),
  cantidad_sistema  integer not null,                               -- foto al iniciar (unidad base)
  cantidad_contada  integer check (cantidad_contada >= 0),          -- null = todavía no se cuenta
  -- Diferencia: positiva = sobra en físico; negativa = falta en físico
  diferencia        integer generated always as (cantidad_contada - cantidad_sistema) stored,
  unique (conteo_id, producto_id)
);

create index detalle_conteo_conteo_idx on public.detalle_conteo (conteo_id);

-- ---------------------------------------------------------------------
-- RPC: iniciar_conteo
-- Crea el conteo y copia el stock actual del sistema de cada producto
-- activo (de la categoría indicada, o de todos).
-- Devuelve: id del conteo.
-- ---------------------------------------------------------------------
create or replace function public.iniciar_conteo(
  p_ubicacion smallint,
  p_categoria text default null,
  p_notas     text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  perform public.exigir_rol('jefe_bodega', 'administrador');

  -- Solo un conteo abierto por ubicación a la vez
  if exists (select 1 from public.conteos where ubicacion_id = p_ubicacion and estado = 'abierto') then
    raise exception 'Ya hay un conteo abierto en esta ubicación. Ciérrelo o cancélelo primero.';
  end if;

  insert into public.conteos (ubicacion_id, categoria, notas, creado_por)
  values (p_ubicacion, nullif(trim(p_categoria), ''), nullif(trim(p_notas), ''), auth.uid())
  returning id into v_id;

  -- Foto del sistema: un renglón por producto activo
  insert into public.detalle_conteo (conteo_id, producto_id, cantidad_sistema)
  select v_id, p.id, coalesce(e.cantidad, 0)
  from public.productos p
  left join public.existencias e on e.producto_id = p.id and e.ubicacion_id = p_ubicacion
  where p.activo
    and (nullif(trim(p_categoria), '') is null or p.categoria = trim(p_categoria));

  if not found then
    raise exception 'No hay productos activos para contar con ese filtro';
  end if;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: guardar_cantidad_contada
-- Anota lo contado físicamente en una línea (unidad base).
-- Solo mientras el conteo está abierto.
-- ---------------------------------------------------------------------
create or replace function public.guardar_cantidad_contada(p_detalle bigint, p_cantidad integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.exigir_rol('jefe_bodega', 'administrador');

  if p_cantidad is null or p_cantidad < 0 then
    raise exception 'La cantidad contada debe ser cero o mayor';
  end if;

  update public.detalle_conteo d
  set cantidad_contada = p_cantidad
  from public.conteos c
  where d.id = p_detalle and c.id = d.conteo_id and c.estado = 'abierto';

  if not found then
    raise exception 'La línea no existe o el conteo ya no está abierto';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: cerrar_conteo
-- Exige que todas las líneas estén contadas. Si hay diferencias, crea un
-- documento de AJUSTE (pendiente de aprobación) con:
--   sobrante (diferencia > 0) → entra a la ubicación
--   faltante (diferencia < 0) → sale de la ubicación
-- Devuelve: id del documento de ajuste, o null si no hubo diferencias.
-- ---------------------------------------------------------------------
create or replace function public.cerrar_conteo(p_conteo bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conteo     public.conteos;
  v_faltan     integer;
  v_lineas     jsonb;
  v_documento  bigint;
begin
  perform public.exigir_rol('jefe_bodega', 'administrador');

  select * into v_conteo from public.conteos where id = p_conteo for update;
  if v_conteo.id is null or v_conteo.estado <> 'abierto' then
    raise exception 'El conteo no existe o ya no está abierto';
  end if;

  -- Todas las líneas deben estar contadas
  select count(*) into v_faltan
  from public.detalle_conteo
  where conteo_id = p_conteo and cantidad_contada is null;
  if v_faltan > 0 then
    raise exception 'Faltan % producto(s) por contar', v_faltan;
  end if;

  -- Líneas del ajuste a partir de las diferencias
  select jsonb_agg(jsonb_build_object(
           'producto_id',          d.producto_id,
           'ubicacion_origen_id',  case when d.diferencia < 0 then v_conteo.ubicacion_id end,
           'ubicacion_destino_id', case when d.diferencia > 0 then v_conteo.ubicacion_id end,
           'cantidad',             abs(d.diferencia)))
  into v_lineas
  from public.detalle_conteo d
  where d.conteo_id = p_conteo and d.diferencia <> 0;

  -- Con diferencias: crear el ajuste (queda pendiente de aprobación)
  if v_lineas is not null then
    v_documento := public.crear_documento(
      'ajuste',
      v_lineas,
      jsonb_build_object('motivo', 'Ajuste por conteo físico #' || p_conteo)
    );
  end if;

  update public.conteos
  set estado = 'cerrado', cerrado_en = now(), documento_ajuste_id = v_documento
  where id = p_conteo;

  return v_documento;
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: cancelar_conteo
-- Cancela un conteo abierto sin generar ajuste.
-- ---------------------------------------------------------------------
create or replace function public.cancelar_conteo(p_conteo bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.exigir_rol('jefe_bodega', 'administrador');

  update public.conteos set estado = 'cancelado', cerrado_en = now()
  where id = p_conteo and estado = 'abierto';

  if not found then
    raise exception 'El conteo no existe o ya no está abierto';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Bitácora (RF-41)
-- ---------------------------------------------------------------------
create trigger bitacora_conteos after insert or update or delete on public.conteos
  for each row execute function public.registrar_bitacora();
create trigger bitacora_detalle_conteo after update on public.detalle_conteo
  for each row execute function public.registrar_bitacora();

-- ---------------------------------------------------------------------
-- Seguridad: solo bodega y administración leen conteos.
-- Las escrituras se hacen solo con las funciones de arriba.
-- ---------------------------------------------------------------------
alter table public.conteos        enable row level security;
alter table public.detalle_conteo enable row level security;

create policy "bodega lee conteos" on public.conteos for select to authenticated
  using (public.rol_actual() in ('jefe_bodega', 'administrador'));
create policy "bodega lee detalle de conteo" on public.detalle_conteo for select to authenticated
  using (public.rol_actual() in ('jefe_bodega', 'administrador'));

revoke execute on function public.iniciar_conteo(smallint, text, text)        from public, anon;
revoke execute on function public.guardar_cantidad_contada(bigint, integer)   from public, anon;
revoke execute on function public.cerrar_conteo(bigint)                       from public, anon;
revoke execute on function public.cancelar_conteo(bigint)                     from public, anon;

grant execute on function public.iniciar_conteo(smallint, text, text)         to authenticated;
grant execute on function public.guardar_cantidad_contada(bigint, integer)    to authenticated;
grant execute on function public.cerrar_conteo(bigint)                        to authenticated;
grant execute on function public.cancelar_conteo(bigint)                      to authenticated;