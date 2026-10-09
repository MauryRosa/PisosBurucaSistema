/**
 * supabase.ts
 * Conexión única con Supabase (base de datos, login, tiempo real).
 * Toda la aplicación importa "supabase" desde aquí; nunca se crea otro cliente.
 */
import { createClient } from '@supabase/supabase-js'

// Datos de conexión leídos del archivo .env.local
const url = import.meta.env.VITE_SUPABASE_URL
const clave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Si faltan, detenemos la aplicación con un mensaje claro
if (!url || !clave) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY. Copie .env.example como .env.local y llénelo.',
  )
}

/** Cliente de Supabase que usa toda la aplicación. */
export const supabase = createClient(url, clave)

/**
 * mensajeError: convierte cualquier error (de Supabase o de JavaScript)
 * en un texto que se puede mostrar al usuario.
 * Traduce los códigos de PostgreSQL más comunes.
 * @param error Error recibido en un try/catch o en la respuesta de Supabase.
 * @returns Mensaje legible.
 */
export function mensajeError(error: unknown): string {
  if (error && typeof error === 'object') {
    const e = error as { code?: string; message?: string }
    if (e.code === '23505') return 'Ya existe un registro con ese código o nombre.' // dato repetido
    if (e.code === '42501') return 'No tiene permiso para esta operación.' // bloqueado por seguridad
    if (e.code === '23514') return 'Los datos no cumplen una regla del sistema.' // regla CHECK
    if (e.message) return e.message
  }
  return 'Ocurrió un error inesperado'
}
