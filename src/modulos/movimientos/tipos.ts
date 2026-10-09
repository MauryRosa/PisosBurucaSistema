/**
 * tipos.ts (módulo Movimientos)
 * Tipos de movimiento que maneja la pantalla "Mermas y otros".
 * Está en un archivo aparte porque lo usan varios componentes
 * (FormularioMovimiento y PaginaMovimientos).
 */

/** Tipos de movimiento (salidas que no son ventas). */
export const TIPOS_MOVIMIENTO = [
  'merma',
  'consumo_interno',
  'exhibicion',
  'devolucion_proveedor',
  'cambio_garantia',
] as const

/** Uno de los tipos de movimiento anteriores. */
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number]
