/**
 * SeccionUbicaciones.tsx
 * Lista de ubicaciones (solo lectura en esta versión).
 * Agregar ubicaciones nuevas (RF-08) es de prioridad baja; se hará después.
 */
import { claseCelda, claseEncabezado, claseTabla } from '@/components/estilos'
import { mensajeError } from '@/lib/supabase'
import { useUbicaciones } from './api'

/**
 * SeccionUbicaciones: muestra la bodega principal y la minibodega.
 */
export function SeccionUbicaciones() {
  const ubicaciones = useUbicaciones()

  if (ubicaciones.isPending) return <p className="text-slate-500 dark:text-slate-400">Cargando…</p>
  if (ubicaciones.isError)
    return <p className="text-red-700 dark:text-red-400">{mensajeError(ubicaciones.error)}</p>

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <table className={claseTabla}>
        <thead className={claseEncabezado}>
          <tr>
            <th className={claseCelda}>Nombre</th>
            <th className={claseCelda}>Tipo</th>
            <th className={claseCelda}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {ubicaciones.data.map((u) => (
            <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800">
              <td className={claseCelda}>{u.nombre}</td>
              <td className={claseCelda}>{u.es_principal ? 'Principal' : 'Secundaria'}</td>
              <td className={claseCelda}>{u.activa ? 'Activa' : 'Inactiva'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
