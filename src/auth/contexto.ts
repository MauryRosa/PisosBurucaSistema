/**
 * contexto.ts
 * "Contexto" de sesión: permite que cualquier pantalla sepa quién está
 * conectado (sesión de login + perfil con su rol) sin pasarlo de mano en mano.
 */
import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Perfil } from '@/types'

/** Información de la sesión disponible para toda la aplicación. */
export interface EstadoSesion {
  sesion: Session | null // sesión de Supabase Auth (null = no ha iniciado sesión)
  perfil: Perfil | null // perfil con nombre y rol
  cargando: boolean // true mientras se revisa la sesión al abrir la app
  cerrarSesion: () => Promise<void> // función para salir del sistema
}

/** Contenedor del estado de sesión (lo llena <ProveedorSesion>). */
export const ContextoSesion = createContext<EstadoSesion | null>(null)

/**
 * useSesion: devuelve la sesión y el perfil del usuario conectado.
 * Uso en cualquier pantalla: const { perfil } = useSesion()
 */
export function useSesion(): EstadoSesion {
  const valor = useContext(ContextoSesion)
  if (!valor) throw new Error('useSesion debe usarse dentro de <ProveedorSesion>')
  return valor
}
