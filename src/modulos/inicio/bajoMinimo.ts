// =====================================================================
// Productos bajo stock mínimo (para el dashboard de Inicio)
// Funciones puras: no consultan la base, solo calculan. Así se pueden
// probar con Vitest (bajoMinimo.test.ts).
//
// Regla: se suma el DISPONIBLE (físico − reservado) de todas las
// ubicaciones de cada producto. Si ese total es menor que su stock
// mínimo, el producto aparece en la lista.
// =====================================================================

/** Columnas de la vista v_stock que se necesitan para el cálculo. */
export type FilaStockMinimo = {
  producto_id: number
  codigo: string
  nombre: string
  piezas_por_caja: number | null
  stock_minimo: number
  disponible: number
}

/** Un producto que está por debajo de su mínimo. */
export type ProductoBajoMinimo = {
  producto_id: number
  codigo: string
  nombre: string
  piezas_por_caja: number | null
  stock_minimo: number
  disponible: number // total de todas las ubicaciones (unidad base)
  faltante: number // cuánto falta para llegar al mínimo
  porcentaje: number // disponible / mínimo, de 0 a 100
}

/**
 * Agrupa las filas de v_stock por producto, suma el disponible de todas
 * sus ubicaciones y devuelve solo los que están por debajo del mínimo.
 * Los más críticos (menor porcentaje) van primero.
 * Los productos sin mínimo (0) no se toman en cuenta.
 */
export function calcularBajoMinimo(filas: FilaStockMinimo[]): ProductoBajoMinimo[] {
  // 1. Total disponible por producto (se copian las filas, no se modifican)
  const totales = new Map<number, FilaStockMinimo>()
  for (const fila of filas) {
    const anterior = totales.get(fila.producto_id)
    const disponible = (anterior?.disponible ?? 0) + Math.max(fila.disponible, 0)
    totales.set(fila.producto_id, { ...fila, disponible })
  }

  // 2. Solo los que tienen mínimo y están por debajo
  return [...totales.values()]
    .filter((p) => p.stock_minimo > 0 && p.disponible < p.stock_minimo)
    .map((p) => ({
      ...p,
      faltante: p.stock_minimo - p.disponible,
      porcentaje: Math.round((p.disponible / p.stock_minimo) * 100),
    }))
    .sort((a, b) => a.porcentaje - b.porcentaje || a.nombre.localeCompare(b.nombre))
}

/**
 * Muestra una cantidad (en unidad base) como la lee la bodega:
 *   pisos (con piezas por caja) → "Cajas 10 · Piezas 21"
 *   accesorios                  → "35 unidades" (o "1 unidad")
 */
export function textoCantidad(cantidad: number, piezasPorCaja: number | null): string {
  if (piezasPorCaja && piezasPorCaja > 1) {
    const cajas = Math.floor(cantidad / piezasPorCaja)
    return `Cajas ${cajas} · Piezas ${cantidad}`
  }
  return `${cantidad} ${cantidad === 1 ? 'unidad' : 'unidades'}`
}

/**
 * Nivel de alerta de un producto bajo mínimo:
 *   agotado → no queda nada disponible
 *   critico → queda menos de la mitad del mínimo
 *   bajo    → queda la mitad o más (pero aún bajo el mínimo)
 */
export function nivelAlerta(producto: ProductoBajoMinimo): 'agotado' | 'critico' | 'bajo' {
  if (producto.disponible <= 0) return 'agotado'
  if (producto.disponible * 2 < producto.stock_minimo) return 'critico'
  return 'bajo'
}

/** Nombre y clases de Tailwind de cada nivel de alerta (etiqueta y barra). */
export const ESTILO_NIVEL: Record<
  ReturnType<typeof nivelAlerta>,
  { texto: string; etiqueta: string; barra: string }
> = {
  agotado: {
    texto: 'Agotado',
    etiqueta: 'bg-marca-rojo text-white',
    barra: 'bg-marca-rojo',
  },
  critico: {
    texto: 'Crítico',
    etiqueta: 'bg-marca-rojo-claro text-marca-rojo-oscuro dark:bg-marca-rojo/20 dark:text-red-300',
    barra: 'bg-marca-rojo',
  },
  bajo: {
    texto: 'Bajo',
    etiqueta: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
    barra: 'bg-amber-500',
  },
}
