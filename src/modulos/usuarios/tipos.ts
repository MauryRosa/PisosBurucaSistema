/**
 * tipos.ts (módulo Usuarios)
 * Tipos de usuarios del sistema y de registros de la bitácora (RF-40, RF-41).
 */
import type { Rol } from '@/types'

/** Usuario: perfil (nombre, rol, activo) + datos de acceso (correo, último acceso). */
export interface UsuarioSistema {
  id: string
  nombre: string
  rol: Rol
  activo: boolean
  creado_en: string
  email: string | null
  ultimo_acceso: string | null
}

/** Registro de la bitácora (tabla "bitacora"). */
export interface RegistroBitacora {
  id: number
  usuario_id: string | null // null = cambio hecho por el sistema
  fecha: string
  accion: 'INSERT' | 'UPDATE' | 'DELETE'
  tabla: string
  registro_id: string | null
  valor_anterior: Record<string, unknown> | null
  valor_nuevo: Record<string, unknown> | null
}

/** Nombre visible de cada tabla auditada. */
export const NOMBRE_TABLA: Record<string, string> = {
  perfiles: 'Usuarios',
  productos: 'Productos',
  proveedores: 'Proveedores',
  ubicaciones: 'Ubicaciones',
  documentos: 'Documentos',
  detalle_documento: 'Líneas de documento',
  reservas: 'Reservas',
  conteos: 'Conteos',
  detalle_conteo: 'Líneas de conteo',
  ordenes_pedido: 'Órdenes de pedido',
  detalle_orden_pedido: 'Líneas de orden',
}

/** Nombre visible de cada acción. */
export const NOMBRE_ACCION: Record<RegistroBitacora['accion'], string> = {
  INSERT: 'Alta',
  UPDATE: 'Cambio',
  DELETE: 'Borrado',
}
