/**
 * tipos.ts (módulo Reportes)
 * Fila de la vista v_movimientos (una línea de un documento).
 */
import type { EstadoDocumento, TipoComprobante, TipoDocumento } from '@/lib/documentos'
import type { TipoProducto } from '@/lib/unidades'

/** Una línea de movimiento con todos sus datos legibles. */
export interface FilaMovimiento {
  documento_id: number
  numero: string
  tipo: TipoDocumento
  estado: EstadoDocumento
  fecha: string
  tipo_comprobante: TipoComprobante | null
  numero_comprobante: string | null
  documento_proveedor: string | null
  motivo: string | null
  retira_nombre: string | null
  retira_placa: string | null
  motivo_anulacion: string | null
  proveedor: string | null
  registro: string | null
  linea_id: number
  producto_id: number
  codigo: string
  producto: string
  tipo_producto: TipoProducto
  categoria: string
  unidad: string
  piezas_por_caja: number | null
  ubicacion_origen_id: number | null
  origen: string | null
  ubicacion_destino_id: number | null
  destino: string | null
  cantidad: number // unidad base
}

/**
 * comoProducto: datos de unidades de una fila, para usar formatearStock.
 */
export function comoProducto(f: FilaMovimiento) {
  return { tipo: f.tipo_producto, unidad: f.unidad, piezas_por_caja: f.piezas_por_caja }
}
