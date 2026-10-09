/**
 * ReporteSalidas.tsx
 * Reporte de salidas por periodo (RF-38): cada orden de salida con su
 * factura o recibo, para cuadrar contra el sistema de Hacienda y el Excel
 * de recibos. Incluye las anuladas (marcadas) para que el cuadre sea completo.
 */
import { useState } from 'react'
import { claseBoton, claseCelda, claseEncabezado, claseTabla } from '@/components/estilos'
import { NOMBRE_TIPO_DOCUMENTO } from '@/lib/documentos'
import { exportarExcel } from '@/lib/excel'
import { formatearFechaHora, hoyLocal, inicioDeMes } from '@/lib/fechas'
import { mensajeError } from '@/lib/supabase'
import { formatearStock } from '@/lib/unidades'
import { useMovimientosPeriodo } from './api'
import { FiltroFechas } from './FiltroFechas'
import { comoProducto } from './tipos'

/**
 * ReporteSalidas: filtros, resumen, tabla y exportación.
 */
export function ReporteSalidas() {
  const [desde, setDesde] = useState(inicioDeMes())
  const [hasta, setHasta] = useState(hoyLocal())
  const salidas = useMovimientosPeriodo(desde, hasta, ['salida_venta', 'despacho_minibodega'])

  const filas = salidas.data ?? []

  // Resumen para el cuadre
  const ordenes = new Set(filas.map((f) => f.documento_id)).size
  const anuladas = new Set(filas.filter((f) => f.estado === 'anulado').map((f) => f.documento_id))
    .size
  const comprobantes = new Set(
    filas
      .filter((f) => f.estado !== 'anulado')
      .map((f) => `${f.tipo_comprobante}-${f.numero_comprobante}`),
  ).size

  /** exportar: descarga el reporte en Excel con una fila por producto. */
  const exportar = () =>
    exportarExcel(
      `salidas-${desde}-a-${hasta}`,
      'Salidas',
      filas.map((f) => ({
        Fecha: formatearFechaHora(f.fecha),
        'Orden de salida': f.numero,
        Tipo: NOMBRE_TIPO_DOCUMENTO[f.tipo],
        Comprobante: f.tipo_comprobante === 'factura' ? 'Factura' : 'Recibo',
        'Número comprobante': f.numero_comprobante,
        Código: f.codigo,
        Producto: f.producto,
        Cantidad: formatearStock(comoProducto(f), f.cantidad),
        'Cantidad (unidad base)': f.cantidad,
        Unidad: f.unidad,
        'Sale de': f.origen,
        Retira: f.retira_nombre,
        Placa: f.retira_placa,
        Estado: f.estado,
        'Motivo anulación': f.motivo_anulacion,
        Registró: f.registro,
      })),
    )

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
        <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
        <button
          type="button"
          onClick={exportar}
          disabled={filas.length === 0}
          className={claseBoton}
        >
          Exportar a Excel
        </button>
      </div>

      {salidas.isSuccess && (
        <p className="text-sm text-slate-600">
          {ordenes} órdenes de salida · {anuladas} anuladas · {comprobantes} facturas/recibos
          distintos (sin contar anuladas)
        </p>
      )}
      {salidas.isPending && <p className="text-slate-500">Cargando…</p>}
      {salidas.isError && <p className="text-red-700">{mensajeError(salidas.error)}</p>}

      {salidas.isSuccess && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className={claseTabla}>
            <thead className={claseEncabezado}>
              <tr>
                <th className={claseCelda}>Fecha</th>
                <th className={claseCelda}>Orden</th>
                <th className={claseCelda}>Comprobante</th>
                <th className={claseCelda}>Producto</th>
                <th className={claseCelda}>Cantidad</th>
                <th className={claseCelda}>Sale de</th>
                <th className={claseCelda}>Retira</th>
                <th className={claseCelda}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr
                  key={f.linea_id}
                  className={`border-t border-slate-100 ${f.estado === 'anulado' ? 'text-red-700 line-through' : ''}`}
                >
                  <td className={`${claseCelda} whitespace-nowrap`}>
                    {formatearFechaHora(f.fecha)}
                  </td>
                  <td className={`${claseCelda} font-mono text-xs`}>{f.numero}</td>
                  <td className={claseCelda}>
                    {f.tipo_comprobante === 'factura' ? 'Factura' : 'Recibo'} {f.numero_comprobante}
                  </td>
                  <td className={claseCelda}>{f.producto}</td>
                  <td className={claseCelda}>{formatearStock(comoProducto(f), f.cantidad)}</td>
                  <td className={claseCelda}>{f.origen}</td>
                  <td className={claseCelda}>{f.retira_nombre ?? '—'}</td>
                  <td className={`${claseCelda} capitalize`}>{f.estado}</td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                    No hay salidas en este periodo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
