/**
 * ReporteMovimientos.tsx
 * Todos los movimientos de un periodo, filtrables por tipo
 * (mermas, entradas, traslados, ajustes...) · RF-39.
 */
import { useState } from 'react'
import { Campo } from '@/components/Campo'
import {
  claseBoton,
  claseCelda,
  claseEncabezado,
  claseInput,
  claseTabla,
} from '@/components/estilos'
import { NOMBRE_TIPO_DOCUMENTO, type TipoDocumento } from '@/lib/documentos'
import { exportarExcel } from '@/lib/excel'
import { formatearFechaHora, hoyLocal, inicioDeMes, textoPeriodo } from '@/lib/fechas'
import { mensajeError } from '@/lib/supabase'
import { formatearStock } from '@/lib/unidades'
import { useMovimientosPeriodo } from './api'
import { FiltroFechas } from './FiltroFechas'
import { comoProducto, type FilaMovimiento } from './tipos'

// Lista de tipos para el selector
const TIPOS = Object.keys(NOMBRE_TIPO_DOCUMENTO) as TipoDocumento[]

/**
 * referencia: comprobante, documento del proveedor o motivo de la línea.
 */
function referencia(f: FilaMovimiento): string {
  if (f.numero_comprobante) {
    return `${f.tipo_comprobante === 'factura' ? 'Factura' : 'Recibo'} ${f.numero_comprobante}`
  }
  if (f.documento_proveedor) return `${f.proveedor ?? ''} · ${f.documento_proveedor}`
  return f.motivo ?? ''
}

/**
 * ReporteMovimientos: filtros, tabla y exportación.
 */
export function ReporteMovimientos() {
  const [desde, setDesde] = useState(inicioDeMes())
  const [hasta, setHasta] = useState(hoyLocal())
  const [tipo, setTipo] = useState<TipoDocumento | 'todos'>('todos')
  const movimientos = useMovimientosPeriodo(desde, hasta, tipo === 'todos' ? [] : [tipo])
  const filas = movimientos.data ?? []

  /** exportar: descarga los movimientos en Excel. */
  const exportar = () =>
    exportarExcel(
      `movimientos-${tipo}-${desde}-a-${hasta}`,
      'Movimientos',
      filas.map((f) => ({
        Fecha: formatearFechaHora(f.fecha),
        Documento: f.numero,
        Tipo: NOMBRE_TIPO_DOCUMENTO[f.tipo],
        Estado: f.estado,
        Referencia: referencia(f),
        Código: f.codigo,
        Producto: f.producto,
        Categoría: f.categoria,
        Cantidad: formatearStock(comoProducto(f), f.cantidad),
        'Cantidad (unidad base)': f.cantidad,
        Unidad: f.unidad,
        'Sale de': f.origen,
        'Entra a': f.destino,
        Registró: f.registro,
      })),
      {
        titulo: 'Reporte de movimientos de inventario',
        subtitulo: `${textoPeriodo(desde, hasta)} · Tipo: ${
          tipo === 'todos' ? 'Todos' : NOMBRE_TIPO_DOCUMENTO[tipo]
        }`,
      },
    )

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4 sm:items-end">
        <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
        <Campo etiqueta="Tipo">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoDocumento | 'todos')}
            className={claseInput}
          >
            <option value="todos">Todos</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {NOMBRE_TIPO_DOCUMENTO[t]}
              </option>
            ))}
          </select>
        </Campo>
        <button
          type="button"
          onClick={exportar}
          disabled={filas.length === 0}
          className={claseBoton}
        >
          Exportar a Excel
        </button>
      </div>

      {movimientos.isPending && <p className="text-slate-500 dark:text-slate-400">Cargando…</p>}
      {movimientos.isError && (
        <p className="text-red-700 dark:text-red-400">{mensajeError(movimientos.error)}</p>
      )}

      {movimientos.isSuccess && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className={claseTabla}>
            <thead className={claseEncabezado}>
              <tr>
                <th className={claseCelda}>Fecha</th>
                <th className={claseCelda}>Documento</th>
                <th className={claseCelda}>Tipo</th>
                <th className={claseCelda}>Referencia</th>
                <th className={claseCelda}>Producto</th>
                <th className={claseCelda}>Cantidad</th>
                <th className={claseCelda}>Sale de</th>
                <th className={claseCelda}>Entra a</th>
                <th className={claseCelda}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.linea_id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className={`${claseCelda} whitespace-nowrap`}>
                    {formatearFechaHora(f.fecha)}
                  </td>
                  <td className={`${claseCelda} font-mono text-xs`}>{f.numero}</td>
                  <td className={claseCelda}>{NOMBRE_TIPO_DOCUMENTO[f.tipo]}</td>
                  <td className={claseCelda}>{referencia(f)}</td>
                  <td className={claseCelda}>{f.producto}</td>
                  <td className={claseCelda}>{formatearStock(comoProducto(f), f.cantidad)}</td>
                  <td className={claseCelda}>{f.origen ?? '—'}</td>
                  <td className={claseCelda}>{f.destino ?? '—'}</td>
                  <td className={`${claseCelda} capitalize`}>{f.estado}</td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                  >
                    No hay movimientos en este periodo.
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
