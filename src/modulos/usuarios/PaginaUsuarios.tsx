/**
 * PaginaUsuarios.tsx
 * Administración de usuarios (RF-40) y bitácora (RF-41). Solo administrador.
 */
import { useState } from 'react'
import { useSesion } from '@/auth/contexto'
import { claseCelda, claseEncabezado, claseTabla } from '@/components/estilos'
import { mensajeError } from '@/lib/supabase'
import { useUsuarios } from './api'
import { FilaUsuario } from './FilaUsuario'
import { FormularioUsuario } from './FormularioUsuario'
import { PanelBitacora } from './PanelBitacora'

// Pestañas de la pantalla
const PESTANAS = [
  { id: 'usuarios', titulo: 'Usuarios' },
  { id: 'bitacora', titulo: 'Bitácora' },
] as const

type IdPestana = (typeof PESTANAS)[number]['id']

/**
 * PaginaUsuarios: pestañas de usuarios y bitácora.
 */
export function PaginaUsuarios() {
  const { perfil } = useSesion()
  const usuarios = useUsuarios()
  const [pestana, setPestana] = useState<IdPestana>('usuarios')

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="text-sm text-slate-500">
          Usuarios del sistema, sus roles y la bitácora de cambios.
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPestana(p.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${
              pestana === p.id
                ? 'border-slate-900 font-medium text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {p.titulo}
          </button>
        ))}
      </div>

      {pestana === 'usuarios' && (
        <div className="space-y-6">
          <FormularioUsuario />

          {usuarios.isPending && <p className="text-slate-500">Cargando…</p>}
          {usuarios.isError && <p className="text-red-700">{mensajeError(usuarios.error)}</p>}

          {usuarios.isSuccess && (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className={claseTabla}>
                <thead className={claseEncabezado}>
                  <tr>
                    <th className={claseCelda}>Nombre</th>
                    <th className={claseCelda}>Correo</th>
                    <th className={claseCelda}>Rol</th>
                    <th className={claseCelda}>Estado</th>
                    <th className={claseCelda}>Último acceso</th>
                    <th className={claseCelda}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.data.map((u) => (
                    <FilaUsuario
                      key={`${u.id}-${u.nombre}-${u.rol}`}
                      usuario={u}
                      esYo={u.id === perfil?.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {pestana === 'bitacora' && <PanelBitacora />}
    </section>
  )
}
