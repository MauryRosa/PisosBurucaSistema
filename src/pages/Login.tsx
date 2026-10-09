/**
 * Login.tsx
 * Pantalla de inicio de sesión con correo y contraseña (RF-40).
 * Los usuarios los crea el administrador en Supabase; no hay registro público.
 */
import { useState } from 'react'
import { Navigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase, mensajeError } from '@/lib/supabase'
import { useSesion } from '@/auth/contexto'

// Reglas de validación del formulario
const esquema = z.object({
  correo: z.email('Correo no válido'),
  contrasena: z.string().min(6, 'Mínimo 6 caracteres'),
})

type Datos = z.infer<typeof esquema>

/**
 * Login: formulario de entrada. Si ya hay sesión, manda directo al inicio.
 */
export function Login() {
  const { sesion } = useSesion()
  const [error, setError] = useState<string | null>(null) // error de Supabase
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Datos>({ resolver: zodResolver(esquema) })

  if (sesion) return <Navigate to="/inicio" replace />

  /**
   * entrar: envía correo y contraseña a Supabase Auth.
   * Si son correctos, la sesión cambia y el usuario pasa al inicio.
   */
  const entrar = async ({ correo, contrasena }: Datos) => {
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    })
    if (error) setError('Correo o contraseña incorrectos')
    if (error) console.error(mensajeError(error)) // detalle técnico en consola
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handleSubmit(entrar)}
        className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="text-xl font-semibold">Pisos Buruca</h1>
          <p className="text-sm text-slate-500">Control de inventario de bodega</p>
        </div>

        <label className="block text-sm">
          Correo
          <input
            type="email"
            autoComplete="username"
            {...register('correo')}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
          {errors.correo && <span className="text-red-700">{errors.correo.message}</span>}
        </label>

        <label className="block text-sm">
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            {...register('contrasena')}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
          {errors.contrasena && <span className="text-red-700">{errors.contrasena.message}</span>}
        </label>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
