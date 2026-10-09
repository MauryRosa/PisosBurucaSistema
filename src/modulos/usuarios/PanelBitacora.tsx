/**
 * PanelBitacora.tsx
 * Consulta de la bitácora de auditoría (RF-41): quién hizo qué cambio,
 * cuándo, en qué tabla y qué valores cambiaron. Exportable a Excel.
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
import { exportarExcel } from '@/lib/excel'
import { formatearFechaHora, hoyLocal } from '@/lib/fechas'
import { mensajeError } from '@/lib/supabase'
import { FiltroFechas } from '@/modulos/reportes/FiltroFechas'
import { useBitacora, usePerfilesNombres } from './api'
import { camposCambiados, resumenRegistro, valorTexto } from './bitacora'
import { NOMBRE_ACCION, NOMBRE_TABLA, type RegistroBitacora } from './tipos'

/**
 * descripcionCambios: texto "campo: antes → después" de los campos que cambiaron.
 */
function descripcionCambios(r: RegistroBitacora): string {
  return camposCambiados(r.valor_anterior, r.valor_nuevo)
    .map((c) => `${c.campo}: ${valorTexto(c.antes)} → ${valorTexto(c.despues)}`)
    .join(' · ')
}

/**
 * PanelBitacora: filtros, tabla y exportación de la bitácora.
 */
export function PanelBitacora() {
  const [desde, setDesde] = useState(hoyLocal())
  const [hasta, setHasta] = useState(hoyLocal())
  const [tabla, setTabla] = useState('todas')
  const bitacora = useBitacora(desde, hasta, tabla)
  const nombres = usePerfilesNombres()

  /** quien: nombre del usuario que hizo el cambio ("Sistema" si no hay usuario). */
  const quien = (r: RegistroBitacora) =>
    r.usuario_id ? (nombres.data?.get(r.usuario_id) ?? 'Usuario eliminado') : 'Sistema'

  const filas = bitacora.data ?? []

  /** exportar: descarga la bitácora filtrada en Excel. */
  const exportar = () =>
    exportarExcel(
      `bitacora-${desde}-a-${hasta}`,
      'Bitácora',
      filas.map((r) => ({
        Fecha: formatearFechaHora(r.fecha),
        Usuario: quien(r),
        Acción: NOMBRE_ACCION[r.accion],
        Tabla: NOMBRE_TABLA[r.tabla] ?? r.tabla,
        Registro: resumenRegistro(r.valor_anterior, r.valor_nuevo) || r.registro_id,
        Cambios: descripcionCambios(r),
      })),
    )

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4 sm:items-end">
        <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
        <Campo etiqueta="Tabla">
          <select value={tabla} onChange={(e) => setTabla(e.target.value)} className={claseInput}>
            <option value="todas">Todas</option>
            {Object.entries(NOMBRE_TABLA).map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
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

      <p className="text-xs text-slate-500">
        Se muestran hasta 300 registros, los más recientes primero. "Sistema" = cambios hechos
        automáticamente (por ejemplo, al crear un usuario desde esta pantalla).
      </p>

      {bitacora.isPending && <p className="text-slate-500">Cargando…</p>}
      {bitacora.isError && <p className="text-red-700">{mensajeError(bitacora.error)}</p>}

      {bitacora.isSuccess && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className={claseTabla}>
            <thead className={claseEncabezado}>
              <tr>
                <th className={claseCelda}>Fecha</th>
                <th className={claseCelda}>Usuario</th>
                <th className={claseCelda}>Acción</th>
                <th className={claseCelda}>Tabla</th>
                <th className={claseCelda}>Registro</th>
                <th className={claseCelda}>Cambios</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 align-top">
                  <td className={`${claseCelda} whitespace-nowrap`}>
                    {formatearFechaHora(r.fecha)}
                  </td>
                  <td className={claseCelda}>{quien(r)}</td>
                  <td className={claseCelda}>{NOMBRE_ACCION[r.accion]}</td>
                  <td className={claseCelda}>{NOMBRE_TABLA[r.tabla] ?? r.tabla}</td>
                  <td className={claseCelda}>
                    {resumenRegistro(r.valor_anterior, r.valor_nuevo) || r.registro_id}
                  </td>
                  <td className={`${claseCelda} max-w-md text-xs break-words`}>
                    {descripcionCambios(r) || '—'}
                  </td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    No hay registros en este periodo.
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
