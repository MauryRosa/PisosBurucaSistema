/**
 * SeccionProveedores.tsx
 * Lista de proveedores con opciones para crear, editar y activar/desactivar.
 */
import { useState } from 'react'
import {
  claseBoton,
  claseBotonTabla,
  claseCelda,
  claseEncabezado,
  claseTabla,
} from '@/components/estilos'
import { mensajeError } from '@/lib/supabase'
import { useCambiarActivo, useProveedores } from './api'
import { FormularioProveedor } from './FormularioProveedor'
import type { Proveedor } from './tipos'

/**
 * SeccionProveedores: tabla de proveedores + formulario de alta/edición.
 */
export function SeccionProveedores() {
  const proveedores = useProveedores()
  const cambiarActivo = useCambiarActivo('proveedores')
  // null = formulario cerrado, 'nuevo' = alta, objeto = edición
  const [editando, setEditando] = useState<Proveedor | 'nuevo' | null>(null)

  if (proveedores.isPending) return <p className="text-slate-500 dark:text-slate-400">Cargando…</p>
  if (proveedores.isError)
    return <p className="text-red-700 dark:text-red-400">{mensajeError(proveedores.error)}</p>

  return (
    <div className="space-y-4">
      {editando ? (
        <FormularioProveedor
          key={editando === 'nuevo' ? 'nuevo' : editando.id} // reinicia al cambiar de proveedor
          proveedor={editando === 'nuevo' ? null : editando}
          alTerminar={() => setEditando(null)}
        />
      ) : (
        <button type="button" onClick={() => setEditando('nuevo')} className={claseBoton}>
          Nuevo proveedor
        </button>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className={claseTabla}>
          <thead className={claseEncabezado}>
            <tr>
              <th className={claseCelda}>Nombre</th>
              <th className={claseCelda}>Contacto</th>
              <th className={claseCelda}>Teléfono</th>
              <th className={claseCelda}>Estado</th>
              <th className={claseCelda}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {proveedores.data.map((p) => (
              <tr
                key={p.id}
                className={`border-t border-slate-100 dark:border-slate-800 ${p.activo ? '' : 'text-slate-400 dark:text-slate-500'}`}
              >
                <td className={claseCelda}>{p.nombre}</td>
                <td className={claseCelda}>{p.contacto ?? '—'}</td>
                <td className={claseCelda}>{p.telefono ?? '—'}</td>
                <td className={claseCelda}>{p.activo ? 'Activo' : 'Inactivo'}</td>
                <td className={`${claseCelda} space-x-3`}>
                  <button type="button" className={claseBotonTabla} onClick={() => setEditando(p)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className={claseBotonTabla}
                    onClick={() => cambiarActivo.mutate({ id: p.id, activo: !p.activo })}
                  >
                    {p.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
            {proveedores.data.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                >
                  Todavía no hay proveedores.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
