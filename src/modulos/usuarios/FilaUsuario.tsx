/**
 * FilaUsuario.tsx
 * Una fila de la tabla de usuarios con sus acciones: editar nombre y rol,
 * activar/desactivar y cambiar contraseña. El administrador no puede
 * quitarse el rol ni desactivarse a sí mismo.
 */
import { useState } from 'react'
import { claseBotonTabla, claseCelda, claseInput } from '@/components/estilos'
import { formatearFechaHora } from '@/lib/fechas'
import { NOMBRE_ROL } from '@/lib/roles'
import { mensajeError } from '@/lib/supabase'
import type { Rol } from '@/types'
import { useAccionUsuario, useActualizarPerfil } from './api'
import type { UsuarioSistema } from './tipos'

interface Props {
  usuario: UsuarioSistema
  esYo: boolean // true si es el administrador que está usando el sistema
}

/** Qué está haciendo la fila en este momento. */
type Modo = 'ver' | 'editar' | 'contrasena'

/**
 * FilaUsuario: muestra el usuario y permite administrarlo.
 */
export function FilaUsuario({ usuario: u, esYo }: Props) {
  const actualizar = useActualizarPerfil()
  const accion = useAccionUsuario()

  const [modo, setModo] = useState<Modo>('ver')
  const [nombre, setNombre] = useState(u.nombre)
  const [rol, setRol] = useState<Rol>(u.rol)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  /** guardarCambios: actualiza nombre y rol. */
  const guardarCambios = async () => {
    setError(null)
    if (!nombre.trim()) return setError('Escriba el nombre')
    try {
      await actualizar.mutateAsync({ id: u.id, nombre: nombre.trim(), rol })
      setModo('ver')
    } catch (e) {
      setError(mensajeError(e))
    }
  }

  /** guardarContrasena: cambia la contraseña del usuario. */
  const guardarContrasena = async () => {
    setError(null)
    if (password.length < 8) return setError('Mínimo 8 caracteres')
    try {
      await accion.mutateAsync({ accion: 'cambiar_contrasena', id: u.id, password })
      setPassword('')
      setModo('ver')
    } catch (e) {
      setError(mensajeError(e))
    }
  }

  /** alternarActivo: activa o desactiva el acceso del usuario. */
  const alternarActivo = async () => {
    setError(null)
    try {
      await accion.mutateAsync({ accion: u.activo ? 'desactivar' : 'activar', id: u.id })
    } catch (e) {
      setError(mensajeError(e))
    }
  }

  return (
    <tr className={`border-t border-slate-100 align-top ${u.activo ? '' : 'text-slate-400'}`}>
      <td className={claseCelda}>
        {modo === 'editar' ? (
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={`${claseInput} mt-0`}
          />
        ) : (
          <>
            {u.nombre} {esYo && <span className="text-xs text-slate-500">(usted)</span>}
          </>
        )}
      </td>
      <td className={claseCelda}>{u.email ?? '—'}</td>
      <td className={claseCelda}>
        {modo === 'editar' && !esYo ? (
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value as Rol)}
            className={`${claseInput} mt-0`}
          >
            {(Object.keys(NOMBRE_ROL) as Rol[]).map((r) => (
              <option key={r} value={r}>
                {NOMBRE_ROL[r]}
              </option>
            ))}
          </select>
        ) : (
          NOMBRE_ROL[u.rol]
        )}
      </td>
      <td className={claseCelda}>{u.activo ? 'Activo' : 'Inactivo'}</td>
      <td className={`${claseCelda} whitespace-nowrap`}>
        {u.ultimo_acceso ? formatearFechaHora(u.ultimo_acceso) : 'Nunca'}
      </td>
      <td className={`${claseCelda} space-y-1 whitespace-nowrap`}>
        {modo === 'ver' && (
          <div className="space-x-3">
            <button type="button" className={claseBotonTabla} onClick={() => setModo('editar')}>
              Editar
            </button>
            <button type="button" className={claseBotonTabla} onClick={() => setModo('contrasena')}>
              Contraseña
            </button>
            {!esYo && (
              <button
                type="button"
                className={claseBotonTabla}
                onClick={alternarActivo}
                disabled={accion.isPending}
              >
                {u.activo ? 'Desactivar' : 'Activar'}
              </button>
            )}
          </div>
        )}

        {modo === 'editar' && (
          <div className="space-x-3">
            <button type="button" className={claseBotonTabla} onClick={guardarCambios}>
              Guardar
            </button>
            <button
              type="button"
              className={claseBotonTabla}
              onClick={() => {
                setModo('ver')
                setNombre(u.nombre)
                setRol(u.rol)
              }}
            >
              Volver
            </button>
          </div>
        )}

        {modo === 'contrasena' && (
          <div className="flex flex-col gap-1">
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Nueva contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${claseInput} mt-0`}
            />
            <div className="space-x-3">
              <button type="button" className={claseBotonTabla} onClick={guardarContrasena}>
                Guardar
              </button>
              <button type="button" className={claseBotonTabla} onClick={() => setModo('ver')}>
                Volver
              </button>
            </div>
          </div>
        )}

        {error && <span className="block text-xs text-red-700">{error}</span>}
      </td>
    </tr>
  )
}
