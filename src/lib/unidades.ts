/**
 * unidades.ts
 * Conversión de unidades (RF-33 a RF-35). Se usa en todo el sistema.
 *
 * Regla: la base de datos guarda TODO en unidad base
 *   - pisos:      piezas
 *   - accesorios: unidades (bolsa, unidad, galón…)
 * Las cajas solo se calculan para capturar y para mostrar.
 */

export type TipoProducto = 'piso' | 'accesorio'

/** Datos mínimos de un producto para convertir unidades. */
export interface ProductoUnidades {
  tipo: TipoProducto
  unidad: string
  piezas_por_caja: number | null
}

/** Cantidad como la escribe el usuario. */
export interface CantidadCapturada {
  cajas?: number
  piezas?: number // piezas sueltas (pisos) o unidades (accesorios)
}

/**
 * validarEntero: lanza un error si el valor no es un entero mayor o igual a cero.
 */
function validarEntero(valor: number, nombre: string): void {
  if (!Number.isInteger(valor) || valor < 0) {
    throw new Error(`${nombre} debe ser un número entero mayor o igual a cero`)
  }
}

/**
 * aUnidadBase: convierte lo que captura el usuario (cajas + piezas) a unidad base.
 * Ej.: 5 cajas + 1 pieza de un piso de 2 piezas/caja = 11 piezas.
 */
export function aUnidadBase(producto: ProductoUnidades, cantidad: CantidadCapturada): number {
  const cajas = cantidad.cajas ?? 0
  const piezas = cantidad.piezas ?? 0
  validarEntero(cajas, 'Cajas')
  validarEntero(piezas, 'Piezas')

  // Accesorios: solo unidades, nunca cajas
  if (producto.tipo === 'accesorio') {
    if (cajas > 0) throw new Error('Los accesorios se ingresan por unidad, no por caja')
    return piezas
  }

  const porCaja = producto.piezas_por_caja
  if (!porCaja || porCaja <= 0) throw new Error('El producto no tiene piezas por caja definidas')
  return cajas * porCaja + piezas
}

/** Resultado de desglosar una cantidad. */
export interface StockDesglosado {
  cajas: number // cajas completas
  piezasTotales: number // total de piezas (incluye las de las cajas)
  piezasSueltas: number // piezas que no completan una caja
}

/**
 * desglosar: separa una cantidad en unidad base en cajas completas y piezas.
 * Ej.: 21 piezas de 2/caja → 10 cajas, 21 piezas totales, 1 suelta.
 */
export function desglosar(producto: ProductoUnidades, cantidadBase: number): StockDesglosado {
  if (producto.tipo === 'accesorio' || !producto.piezas_por_caja) {
    return { cajas: 0, piezasTotales: cantidadBase, piezasSueltas: cantidadBase }
  }
  const porCaja = producto.piezas_por_caja
  const signo = cantidadBase < 0 ? -1 : 1
  const absoluto = Math.abs(cantidadBase)
  return {
    cajas: signo * Math.floor(absoluto / porCaja),
    piezasTotales: cantidadBase,
    piezasSueltas: signo * (absoluto % porCaja),
  }
}

/**
 * formatearStock: texto de stock como se acordó con bodega.
 *   piso:      "Cajas 10 · Piezas 21"  (piezas = total de piezas)
 *   accesorio: "12 bolsa"
 */
export function formatearStock(producto: ProductoUnidades, cantidadBase: number): string {
  if (producto.tipo === 'accesorio') {
    return `${cantidadBase} ${producto.unidad}`
  }
  const { cajas, piezasTotales } = desglosar(producto, cantidadBase)
  return `Cajas ${cajas} · Piezas ${piezasTotales}`
}
