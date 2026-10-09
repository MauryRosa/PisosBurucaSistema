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
 * @param error Error recibido en un try/catch o en la respuesta de Supabase.
 * @returns Mensaje legible.
 */
export function mensajeError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Ocurrió un error inesperado'
}
