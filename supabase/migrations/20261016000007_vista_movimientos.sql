-- =====================================================================
-- Migración 07: Vista de movimientos para reportes
-- Requerimientos: RF-38 (reporte de salidas para cuadre), RF-39 (kardex,
--                 movimientos por tipo, mermas; exportables a Excel)
--
-- v_movimientos: una fila por cada línea de cada documento, con todos los
-- datos legibles (número, tipo, comprobante, producto, ubicaciones,
-- quién lo registró). Es la base de todos los reportes.
-- security_invoker: respeta la seguridad de "documentos" (solo bodega y
-- administración pueden ver movimientos).
-- =====================================================================

create or replace view public.v_movimientos
with (security_invoker = true)
as
select
  d.id                  as documento_id,
  d.numero,
  d.tipo,
  d.estado,
  d.fecha,
  d.tipo_comprobante,
  d.numero_comprobante,
  d.documento_proveedor,
  d.motivo,
  d.retira_nombre,
  d.retira_placa,
  d.motivo_anulacion,
  pr.nombre             as proveedor,
  pe.nombre             as registro,          -- usuario que registró el documento
  l.id                  as linea_id,
  l.producto_id,
  p.codigo,
  p.nombre              as producto,
  p.tipo                as tipo_producto,
  p.categoria,
  p.unidad,
  p.piezas_por_caja,
  l.ubicacion_origen_id,
  uo.nombre             as origen,            -- de dónde sale (null = entrada)
  l.ubicacion_destino_id,
  ud.nombre             as destino,           -- a dónde entra (null = salida)
  l.cantidad                                  -- unidad base
from public.documentos d
join public.detalle_documento l on l.documento_id = d.id
join public.productos p         on p.id = l.producto_id
left join public.ubicaciones uo on uo.id = l.ubicacion_origen_id
left join public.ubicaciones ud on ud.id = l.ubicacion_destino_id
left join public.proveedores pr on pr.id = d.proveedor_id
left join public.perfiles pe    on pe.id = d.creado_por;

-- Solo usuarios con sesión (la seguridad de documentos filtra por rol)
revoke all on public.v_movimientos from anon;
grant select on public.v_movimientos to authenticated;