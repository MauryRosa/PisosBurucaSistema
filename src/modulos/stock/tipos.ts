/**
 * tipos.ts (módulo Stock)
 * Tipo de una fila de la vista v_stock (un producto en una ubicación).
 */
import type { TipoProducto } from '@/lib/unidades'

/** Fila de la vista v_stock. Cantidades en unidad base. */
export interface FilaStock {
  producto_id: number
  codigo: string
  nombre: string
  tipo: TipoProducto
  categoria: string
  medida: string | null
  unidad: string
  piezas_por_caja: number | null
  stock_minimo: number
  ubicacion_id: number
  ubicacion: string
  fisico: number // lo que hay físicamente
  reservado: number // apartado en reservas activas
  disponible: number // físico - reservado (lo que se puede vender)
}
