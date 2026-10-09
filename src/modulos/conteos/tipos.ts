/**
 * tipos.ts (módulo Conteos)
 * Tipos de datos de conteos físicos y sus líneas (RF-37).
 */
import type { EstadoDocumento } from '@/lib/documentos'
import type { TipoProducto } from '@/lib/unidades'

/** Estado de un conteo. */
export type EstadoConteo = 'abierto' | 'cerrado' | 'cancelado'

/** Conteo con su ubicación, quién lo inició y el ajuste generado. */
export interface Conteo {
  id: number
  ubicacion_id: number
  categoria: string | null // null = conteo total
  notas: string | null
  estado: EstadoConteo
  documento_ajuste_id: number | null
  creado_en: string
  cerrado_en: string | null
  ubicaciones: { nombre: string }
  creador: { nombre: string } | null
  ajuste: { numero: string; estado: EstadoDocumento } | null
}

/** Una línea del conteo: un producto, lo que dice el sistema y lo contado. */
export interface LineaConteo {
  id: number
  producto_id: number
  cantidad_sistema: number // foto al iniciar (unidad base)
  cantidad_contada: number | null // null = aún no se cuenta
  diferencia: number | null // contado - sistema
  productos: {
    codigo: string
    nombre: string
    tipo: TipoProducto
    unidad: string
    piezas_por_caja: number | null
  }
}
