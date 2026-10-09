-- =====================================================================
-- Migración 04: Funciones de movimientos de inventario y vista de stock
-- Toda la lógica de stock vive aquí (RNF-01 a RNF-03). La aplicación
-- las llama con supabase.rpc('nombre_funcion', {...}).
--
-- Funciones que usa la aplicación (RPC):
--   crear_documento    → cualquier entrada, salida, traslado, merma o ajuste
--   aprobar_documento  → aprueba mermas y ajustes (administrador)
--   anular_documento   → anula y revierte un documento (administrador)
--   crear_reserva      → aparta producto (jefe de bodega / administrador)
--   cancelar_reserva   → libera una reserva
-- Vista:
--   v_stock            → físico, reservado y disponible (RF-36)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Función: anio_actual
-- Año en hora de El Salvador (los correlativos se reinician cada año).
-- ---------------------------------------------------------------------
create or replace function public.anio_actual()
returns integer
language sql
stable
as $$
  select extract(year from (now() at time zone 'America/El_Salvador'))::integer;
$$;

-- ---------------------------------------------------------------------
-- Función: serie_de
-- Serie de correlativo según el tipo de documento (RF-29).
-- Ventas y traslados llevan series separadas, como se acordó.
-- ---------------------------------------------------------------------
create or replace function public.serie_de(p_tipo public.tipo_documento)
returns text
language sql
immutable
as $$
  select case p_tipo
    when 'salida_venta'               then 'VEN'  -- ventas desde bodega principal
    when 'despacho_minibodega'        then 'VEN'  -- ventas desde minibodega (misma serie de ventas)
    when 'traslado'                   then 'TRA'
    when 'entrada_compra'             then 'ENT'
    when 'entrada_devolucion_cliente' then 'ENT'
    when 'inventario_inicial'         then 'INI'
    when 'merma'                      then 'MER'
    when 'ajuste'                     then 'AJU'
    else 'MOV'  -- consumo interno, exhibición, devolución a proveedor, cambio/garantía
  end;
$$;

-- ---------------------------------------------------------------------
-- Función: siguiente_correlativo
-- Devuelve el siguiente número de una serie en un año. Es atómica:
-- dos usuarios al mismo tiempo nunca reciben el mismo número.
-- ---------------------------------------------------------------------
create or replace function public.siguiente_correlativo(p_serie text, p_anio integer)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.correlativos as c (serie, anio, ultimo)
  values (p_serie, p_anio, 1)
  on conflict (serie, anio) do update set ultimo = c.ultimo + 1
  returning ultimo;
$$;

-- ---------------------------------------------------------------------
-- Función: ubicacion_principal
-- Id de la bodega principal.
-- ---------------------------------------------------------------------
create or replace function public.ubicacion_principal()
returns smallint
language sql
stable
as $$
  select id from public.ubicaciones where es_principal;
$$;

-- ---------------------------------------------------------------------
-- Función interna: descontar_existencia
-- Resta stock de una ubicación. Falla si quedaría menos de lo reservado
-- (no se puede vender lo que ya está apartado) · RNF-02, RF-27.
-- Bloquea la fila mientras trabaja para evitar ventas dobles (RNF-03).
-- ---------------------------------------------------------------------
create or replace function public.descontar_existencia(p_producto bigint, p_ubicacion smallint, p_cantidad integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fisico    integer; -- lo que hay físicamente
  v_reservado integer; -- lo apartado en reservas activas
  v_nombre    text;
begin
  -- Leer y bloquear el saldo actual
  select cantidad into v_fisico
  from public.existencias
  where producto_id = p_producto and ubicacion_id = p_ubicacion
  for update;

  select coalesce(sum(cantidad), 0) into v_reservado
  from public.reservas
  where producto_id = p_producto and ubicacion_id = p_ubicacion and estado = 'activa';

  -- Validar que alcance el disponible (físico - reservado)
  if coalesce(v_fisico, 0) - p_cantidad < v_reservado then
    select nombre into v_nombre from public.productos where id = p_producto;
    raise exception 'Stock disponible insuficiente para "%": disponible %, solicitado %',
      v_nombre, coalesce(v_fisico, 0) - v_reservado, p_cantidad;
  end if;

  update public.existencias
  set cantidad = cantidad - p_cantidad, actualizado_en = now()
  where producto_id = p_producto and ubicacion_id = p_ubicacion;
end;
$$;

-- ---------------------------------------------------------------------
-- Función interna: sumar_existencia
-- Suma stock a una ubicación (crea la fila si no existía).
-- ---------------------------------------------------------------------
create or replace function public.sumar_existencia(p_producto bigint, p_ubicacion smallint, p_cantidad integer)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.existencias as e (producto_id, ubicacion_id, cantidad)
  values (p_producto, p_ubicacion, p_cantidad)
  on conflict (producto_id, ubicacion_id)
  do update set cantidad = e.cantidad + excluded.cantidad, actualizado_en = now();
$$;

-- ---------------------------------------------------------------------
-- Función interna: aplicar_documento
-- Mueve las existencias según las líneas de un documento.
--   p_signo =  1 → aplica (sale del origen, entra al destino)
--   p_signo = -1 → revierte (para anulaciones)
-- ---------------------------------------------------------------------
create or replace function public.aplicar_documento(p_documento bigint, p_signo integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  l       record;
  v_sale  smallint; -- ubicación de donde se descuenta
  v_entra smallint; -- ubicación a donde se suma
begin
  for l in
    select * from public.detalle_documento where documento_id = p_documento order by id
  loop
    if p_signo = 1 then
      v_sale := l.ubicacion_origen_id;  v_entra := l.ubicacion_destino_id;
    else
      v_sale := l.ubicacion_destino_id; v_entra := l.ubicacion_origen_id;
    end if;

    if v_sale is not null then
      perform public.descontar_existencia(l.producto_id, v_sale, l.cantidad);
    end if;
    if v_entra is not null then
      perform public.sumar_existencia(l.producto_id, v_entra, l.cantidad);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: crear_documento
-- Crea cualquier movimiento de inventario en UNA sola transacción:
-- cabecera + líneas + correlativo + reservas + existencias.
-- Si algo falla, no se guarda nada.
--
-- Parámetros:
--   p_tipo   : tipo de documento (ver tipo_documento)
--   p_lineas : [{"producto_id":1,"ubicacion_origen_id":1,"ubicacion_destino_id":null,"cantidad":21}, ...]
--   p_datos  : {"tipo_comprobante":"factura","numero_comprobante":"123","retira_nombre":"...",
--               "retira_placa":"...","proveedor_id":1,"documento_proveedor":"...",
--               "motivo":"...","evidencia_url":"...","reserva_ids":[1,2]}
-- Devuelve: id del documento creado.
-- ---------------------------------------------------------------------
create or replace function public.crear_documento(
  p_tipo   public.tipo_documento,
  p_lineas jsonb,
  p_datos  jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc        bigint;
  v_anio       integer  := public.anio_actual();
  v_serie      text     := public.serie_de(p_tipo);
  v_principal  smallint := public.ubicacion_principal();
  v_estado     public.estado_documento;
  v_tcomp      public.tipo_comprobante := nullif(p_datos ->> 'tipo_comprobante', '')::public.tipo_comprobante;
  v_ncomp      text := nullif(trim(p_datos ->> 'numero_comprobante'), '');
  v_motivo     text := nullif(trim(p_datos ->> 'motivo'), '');
  v_reservas   bigint[];
  l            record;
begin
  -- 1. Permisos: solo bodega y administración registran movimientos
  perform public.exigir_rol('jefe_bodega', 'administrador');

  -- 2. Debe traer al menos una línea
  if p_lineas is null or jsonb_typeof(p_lineas) <> 'array' or jsonb_array_length(p_lineas) = 0 then
    raise exception 'El documento debe tener al menos una línea';
  end if;

  -- 3. Merma y ajuste quedan pendientes hasta que gerencia apruebe (RF-20, RF-37)
  v_estado := case when p_tipo in ('merma', 'ajuste') then 'pendiente' else 'aprobado' end;

  -- 4. Datos obligatorios según el tipo
  if p_tipo in ('salida_venta', 'despacho_minibodega', 'cambio_garantia') and (v_tcomp is null or v_ncomp is null) then
    raise exception 'Debe indicar el número de factura o recibo';
  end if;
  if p_tipo = 'entrada_compra' and nullif(trim(p_datos ->> 'documento_proveedor'), '') is null then
    raise exception 'Debe indicar la factura o nota de remisión del proveedor';
  end if;
  if p_tipo = 'devolucion_proveedor' and (p_datos ->> 'proveedor_id') is null then
    raise exception 'Debe indicar el proveedor';
  end if;
  if p_tipo in ('merma', 'ajuste', 'consumo_interno', 'exhibicion') and v_motivo is null then
    raise exception 'Debe indicar el motivo';
  end if;

  -- 5. Cabecera con su correlativo
  insert into public.documentos (
    tipo, serie, anio, correlativo, estado,
    tipo_comprobante, numero_comprobante,
    proveedor_id, documento_proveedor,
    retira_nombre, retira_placa, evidencia_url, motivo, creado_por,
    aprobado_por, aprobado_en
  ) values (
    p_tipo, v_serie, v_anio, public.siguiente_correlativo(v_serie, v_anio), v_estado,
    v_tcomp, v_ncomp,
    (p_datos ->> 'proveedor_id')::bigint, nullif(trim(p_datos ->> 'documento_proveedor'), ''),
    nullif(trim(p_datos ->> 'retira_nombre'), ''), nullif(trim(p_datos ->> 'retira_placa'), ''),
    nullif(p_datos ->> 'evidencia_url', ''), v_motivo, auth.uid(),
    case when v_estado = 'aprobado' then auth.uid() end,
    case when v_estado = 'aprobado' then now() end
  )
  returning id into v_doc;

  -- 6. Líneas, validando de dónde sale y a dónde entra según el tipo
  for l in
    select * from jsonb_to_recordset(p_lineas)
      as x(producto_id bigint, ubicacion_origen_id smallint, ubicacion_destino_id smallint, cantidad integer)
  loop
    if l.cantidad is null or l.cantidad <= 0 then
      raise exception 'Las cantidades deben ser mayores a cero';
    end if;

    case
      when p_tipo = 'salida_venta' then
        if l.ubicacion_origen_id is distinct from v_principal or l.ubicacion_destino_id is not null then
          raise exception 'La salida por venta sale de la bodega principal';
        end if;
      when p_tipo = 'despacho_minibodega' then
        if l.ubicacion_origen_id is null or l.ubicacion_origen_id = v_principal or l.ubicacion_destino_id is not null then
          raise exception 'El despacho de minibodega sale de la minibodega';
        end if;
      when p_tipo = 'traslado' then
        if l.ubicacion_origen_id is null or l.ubicacion_destino_id is null then
          raise exception 'El traslado necesita ubicación de origen y destino';
        end if;
      when p_tipo in ('entrada_compra', 'entrada_devolucion_cliente', 'inventario_inicial') then
        if l.ubicacion_destino_id is null or l.ubicacion_origen_id is not null then
          raise exception 'Una entrada solo lleva ubicación de destino';
        end if;
      when p_tipo in ('merma', 'consumo_interno', 'exhibicion', 'devolucion_proveedor') then
        if l.ubicacion_origen_id is null or l.ubicacion_destino_id is not null then
          raise exception 'Una salida solo lleva ubicación de origen';
        end if;
      else -- cambio_garantia y ajuste: cada línea es una entrada o una salida
        if (l.ubicacion_origen_id is null) = (l.ubicacion_destino_id is null) then
          raise exception 'Cada línea debe ser una entrada o una salida';
        end if;
    end case;

    insert into public.detalle_documento (documento_id, producto_id, ubicacion_origen_id, ubicacion_destino_id, cantidad)
    values (v_doc, l.producto_id, l.ubicacion_origen_id, l.ubicacion_destino_id, l.cantidad);
  end loop;

  -- 7. Reservas indicadas por el usuario (lista de ids)
  select coalesce(array_agg(value::bigint), '{}') into v_reservas
  from jsonb_array_elements_text(coalesce(p_datos -> 'reserva_ids', '[]'::jsonb));

  -- 7a. Traslado de producto reservado: la reserva viaja con el producto a la minibodega
  if p_tipo = 'traslado' and cardinality(v_reservas) > 0 then
    update public.reservas r
    set ubicacion_id = d.ubicacion_destino_id
    from public.detalle_documento d
    where d.documento_id = v_doc
      and d.producto_id = r.producto_id
      and d.ubicacion_origen_id = r.ubicacion_id
      and r.id = any (v_reservas)
      and r.estado = 'activa';
  end if;

  -- 7b. Venta: consumir las reservas indicadas y las del mismo comprobante (RF-28)
  if p_tipo in ('salida_venta', 'despacho_minibodega') then
    update public.reservas
    set estado = 'consumida', documento_id = v_doc
    where estado = 'activa'
      and (id = any (v_reservas)
           or (tipo_comprobante = v_tcomp and numero_comprobante = v_ncomp))
      and exists (
        select 1 from public.detalle_documento d
        where d.documento_id = v_doc
          and d.producto_id = reservas.producto_id
          and d.ubicacion_origen_id = reservas.ubicacion_id
      );
  end if;

  -- 8. Mover existencias (solo si quedó aprobado)
  if v_estado = 'aprobado' then
    perform public.aplicar_documento(v_doc, 1);
  end if;

  return v_doc;
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: aprobar_documento
-- El administrador aprueba una merma o ajuste pendiente; en ese momento
-- se descuenta el stock. Puede adjuntar la carta firmada (RF-20).
-- ---------------------------------------------------------------------
create or replace function public.aprobar_documento(p_documento bigint, p_evidencia_url text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado public.estado_documento;
begin
  perform public.exigir_rol('administrador');

  select estado into v_estado from public.documentos where id = p_documento for update;
  if v_estado is distinct from 'pendiente' then
    raise exception 'Solo se aprueban documentos pendientes';
  end if;

  update public.documentos
  set estado = 'aprobado', aprobado_por = auth.uid(), aprobado_en = now(),
      evidencia_url = coalesce(p_evidencia_url, evidencia_url)
  where id = p_documento;

  perform public.aplicar_documento(p_documento, 1);
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: anular_documento · RF-25
-- Pendiente → se rechaza sin tocar stock.
-- Aprobado  → se revierte el movimiento y las reservas vuelven a estar activas.
-- El documento no se borra: queda como "anulado" con su motivo.
-- ---------------------------------------------------------------------
create or replace function public.anular_documento(p_documento bigint, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado public.estado_documento;
begin
  perform public.exigir_rol('administrador');

  if nullif(trim(p_motivo), '') is null then
    raise exception 'Debe indicar el motivo de la anulación';
  end if;

  select estado into v_estado from public.documentos where id = p_documento for update;
  if v_estado is null or v_estado = 'anulado' then
    raise exception 'El documento no existe o ya está anulado';
  end if;

  -- Reservas consumidas por esta salida vuelven a estar activas
  update public.reservas set estado = 'activa', documento_id = null
  where documento_id = p_documento and estado = 'consumida';

  -- Revertir existencias si ya se habían movido
  if v_estado = 'aprobado' then
    perform public.aplicar_documento(p_documento, -1);
  end if;

  update public.documentos
  set estado = 'anulado', anulado_por = auth.uid(), anulado_en = now(), motivo_anulacion = p_motivo
  where id = p_documento;
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: crear_reserva · RF-26
-- El jefe de bodega aparta producto a pedido de una vendedora.
-- Valida que haya disponible suficiente.
-- ---------------------------------------------------------------------
create or replace function public.crear_reserva(
  p_producto           bigint,
  p_ubicacion          smallint,
  p_cantidad           integer,
  p_vendedora          uuid,
  p_tipo_comprobante   public.tipo_comprobante default null,
  p_numero_comprobante text default null,
  p_notas              text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fisico    integer;
  v_reservado integer;
  v_id        bigint;
begin
  perform public.exigir_rol('jefe_bodega', 'administrador');

  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a cero';
  end if;

  -- Bloquear el saldo para que nadie más lo use mientras validamos
  select cantidad into v_fisico from public.existencias
  where producto_id = p_producto and ubicacion_id = p_ubicacion
  for update;

  select coalesce(sum(cantidad), 0) into v_reservado from public.reservas
  where producto_id = p_producto and ubicacion_id = p_ubicacion and estado = 'activa';

  if coalesce(v_fisico, 0) - v_reservado < p_cantidad then
    raise exception 'No hay stock disponible para reservar: disponible %, solicitado %',
      coalesce(v_fisico, 0) - v_reservado, p_cantidad;
  end if;

  insert into public.reservas (producto_id, ubicacion_id, cantidad, vendedora_id,
                               tipo_comprobante, numero_comprobante, notas, creado_por)
  values (p_producto, p_ubicacion, p_cantidad, p_vendedora,
          p_tipo_comprobante, nullif(trim(p_numero_comprobante), ''), p_notas, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: cancelar_reserva · RF-28
-- Libera una reserva activa indicando el motivo.
-- ---------------------------------------------------------------------
create or replace function public.cancelar_reserva(p_reserva bigint, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.exigir_rol('jefe_bodega', 'administrador');

  if nullif(trim(p_motivo), '') is null then
    raise exception 'Debe indicar el motivo de la cancelación';
  end if;

  update public.reservas
  set estado = 'cancelada', motivo_cancelacion = p_motivo
  where id = p_reserva and estado = 'activa';

  if not found then
    raise exception 'La reserva no existe o ya no está activa';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Vista: v_stock · RF-36
-- Por cada producto activo y ubicación activa: físico, reservado y
-- disponible (en unidad base). La pantalla convierte a cajas y piezas.
-- security_invoker: respeta los permisos de quien consulta.
-- ---------------------------------------------------------------------
create or replace view public.v_stock
with (security_invoker = true)
as
select
  p.id                                               as producto_id,
  p.codigo,
  p.nombre,
  p.tipo,
  p.categoria,
  p.medida,
  p.unidad,
  p.piezas_por_caja,
  p.stock_minimo,
  u.id                                               as ubicacion_id,
  u.nombre                                           as ubicacion,
  coalesce(e.cantidad, 0)                            as fisico,
  coalesce(r.reservado, 0)                           as reservado,
  coalesce(e.cantidad, 0) - coalesce(r.reservado, 0) as disponible
from public.productos p
cross join public.ubicaciones u
left join public.existencias e
  on e.producto_id = p.id and e.ubicacion_id = u.id
left join (
  select producto_id, ubicacion_id, sum(cantidad)::integer as reservado
  from public.reservas
  where estado = 'activa'
  group by producto_id, ubicacion_id
) r on r.producto_id = p.id and r.ubicacion_id = u.id
where p.activo and u.activa;

-- ---------------------------------------------------------------------
-- Permisos de ejecución
-- ---------------------------------------------------------------------
-- Internas: la aplicación no puede llamarlas
revoke execute on function public.siguiente_correlativo(text, integer)            from public, anon, authenticated;
revoke execute on function public.descontar_existencia(bigint, smallint, integer) from public, anon, authenticated;
revoke execute on function public.sumar_existencia(bigint, smallint, integer)     from public, anon, authenticated;
revoke execute on function public.aplicar_documento(bigint, integer)              from public, anon, authenticated;

-- RPC: solo usuarios con sesión (cada una revisa el rol por dentro)
revoke execute on function public.crear_documento(public.tipo_documento, jsonb, jsonb) from public, anon;
revoke execute on function public.aprobar_documento(bigint, text)                       from public, anon;
revoke execute on function public.anular_documento(bigint, text)                        from public, anon;
revoke execute on function public.crear_reserva(bigint, smallint, integer, uuid, public.tipo_comprobante, text, text) from public, anon;
revoke execute on function public.cancelar_reserva(bigint, text)                        from public, anon;

grant execute on function public.crear_documento(public.tipo_documento, jsonb, jsonb) to authenticated;
grant execute on function public.aprobar_documento(bigint, text)                       to authenticated;
grant execute on function public.anular_documento(bigint, text)                        to authenticated;
grant execute on function public.crear_reserva(bigint, smallint, integer, uuid, public.tipo_comprobante, text, text) to authenticated;
grant execute on function public.cancelar_reserva(bigint, text)                        to authenticated;

-- La vista solo la consultan usuarios con sesión
revoke all on public.v_stock from anon;
grant select on public.v_stock to authenticated;