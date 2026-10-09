/**
 * types/index.ts
 * Tipos de datos compartidos por toda la aplicación.
 * Deben coincidir con las tablas de la base de datos (supabase/migrations).
 */

/** Roles del sistema (tipo "rol_usuario" en la base de datos). */
export type Rol = 'administrador' | 'jefe_bodega' | 'vendedora'

/** Perfil de un usuario (tabla "perfiles"). */
export interface Perfil {
  id: string // mismo id que el usuario de login (auth.users)
  nombre: string
  rol: Rol
  activo: boolean
  creado_en: string
}
