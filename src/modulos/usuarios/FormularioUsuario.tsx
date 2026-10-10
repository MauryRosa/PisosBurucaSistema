/**
 * FormularioUsuario.tsx
 * Crear un usuario del sistema con correo, contraseña, nombre y rol (RF-40).
 */
import { useState } from 'react'
import { Campo } from '@/components/Campo'
import { claseBoton, claseInput } from '@/components/estilos'
import { NOMBRE_ROL } from '@/lib/roles'
import { mensajeError } from '@/lib/supabase'
import type { Rol } from '@/types'
import { useCrearUsuario } from './api'

/**
 * FormularioUsuario: valida los datos y crea el usuario.
 */
export function FormularioUsuario() {
  const crear = useCrearUsuario()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState<Rol>('vendedora')
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  /** guardar: valida y crea el usuario por la Edge Function. */
  const guardar = async () => {
    setMensaje(null)
    if (!nombre.trim() || !email.trim()) {
      return setMensaje({ tipo: 'error', texto: 'Escriba nombre y correo' })
    }
    if (password.length < 8) {
      return setMensaje({ tipo: 'error', texto: 'La contraseña debe tener 8 caracteres o más' })
    }
    try {
      await crear.mutateAsync({ nombre: nombre.trim(), email: email.trim(), password, rol })
      setMensaje({ tipo: 'ok', texto: `Usuario ${email.trim()} creado como ${NOMBRE_ROL[rol]}.` })
      setNombre('')
      setEmail('')
      setPassword('')
    } catch (e) {
      setMensaje({ tipo: 'error', texto: mensajeError(e) })
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <h2 className="font-semibold">Nuevo usuario</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Campo etiqueta="Nombre">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={claseInput}
          />
        </Campo>
        <Campo etiqueta="Correo">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={claseInput}
          />
        </Campo>
        <Campo etiqueta="Contraseña" ayuda="Mínimo 8 caracteres">
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={claseInput}
          />
        </Campo>
        <Campo etiqueta="Rol">
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value as Rol)}
            className={claseInput}
          >
            {(Object.keys(NOMBRE_ROL) as Rol[]).map((r) => (
              <option key={r} value={r}>
                {NOMBRE_ROL[r]}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      {mensaje && (
        <p
          className={`text-sm ${mensaje.tipo === 'ok' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}
        >
          {mensaje.texto}
        </p>
      )}

      <button type="button" onClick={guardar} disabled={crear.isPending} className={claseBoton}>
        {crear.isPending ? 'Creando…' : 'Crear usuario'}
      </button>
    </div>
  )
}
