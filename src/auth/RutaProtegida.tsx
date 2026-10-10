/**
 * RutaProtegida.tsx
 * Protege pantallas: si no hay sesión manda al login, y si el rol del
 * usuario no tiene permiso muestra un aviso en lugar de la pantalla.
 */
import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import type { Rol } from '@/types'
import { useSesion } from './contexto'

interface Props {
  children: ReactNode // pantalla a proteger
  roles?: Rol[] // si se indica, solo estos roles pueden entrar
}

/**
 * RutaProtegida: decide si se muestra la pantalla, el login o un aviso.
 */
export function RutaProtegida({ children, roles }: Props) {
  const { sesion, perfil, cargando } = useSesion()

  // 1. Todavía revisando la sesión
  if (cargando) return <p className="p-6 text-slate-500 dark:text-slate-400">Cargando…</p>

  // 2. Sin sesión → al login
  if (!sesion) return <Navigate to="/login" replace />

  // 3. Usuario sin perfil o desactivado
  if (!perfil || !perfil.activo) {
    return (
      <p className="p-6 text-red-700 dark:text-red-400">
        Su usuario no tiene un perfil activo. Pida al administrador que lo active.
      </p>
    )
  }

  // 4. Rol sin permiso para esta pantalla
  if (roles && !roles.includes(perfil.rol)) {
    return (
      <p className="p-6 text-red-700 dark:text-red-400">No tiene permiso para ver esta sección.</p>
    )
  }

  // 5. Todo bien → mostrar la pantalla
  return children
}
