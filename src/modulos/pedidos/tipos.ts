/**
 * tipos.ts (módulo Pedidos)
 * Tipos de órdenes de pedido a proveedor y nombres de sus estados (RF-09 a RF-11).
 */
import type { TipoProducto } from '@/lib/unidades'

/** Estado de una orden de pedido. */
export type EstadoOrden = 'pendiente' | 'recibida_parcial' | 'recibida' | 'cancelada'

/** Nombre visible de cada estado. */
export const NOMBRE_ESTADO_ORDEN: Record<EstadoOrden, string> = {
  pendiente: 'Pendiente',
  recibida_parcial: 'Recibida parcial',
  recibida: 'Recibida',
  cancelada: 'Cancelada',
}

/** Color de cada estado. */
export const COLOR_ESTADO_ORDEN: Record<EstadoOrden, string> = {
  pendiente: 'text-amber-700',
  recibida_parcial: 'text-blue-700',
  recibida: 'text-green-700',
  cancelada: 'text-red-700',
}

/** Producto de una orden: lo pedido y lo recibido (unidad base). */
export interface LineaOrden {
  id: number
  producto_id: number
  cantidad: number // pedido
  cantidad_recibida: number // recibido hasta ahora
  productos: {
    codigo: string
    nombre: string
    tipo: TipoProducto
    unidad: string
    piezas_por_caja: number | null
  }
}

/** Orden de pedido con proveedor, creador y productos. */
export interface OrdenPedido {
  id: number
  numero: string
  estado: EstadoOrden
  notas: string | null
  motivo_cancelacion: string | null
  creado_por: string
  creado_en: string
  proveedores: { nombre: string }
  creador: { nombre: string } | null
  detalle_orden_pedido: LineaOrden[]
}
