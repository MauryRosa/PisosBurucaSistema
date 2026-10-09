/**
 * kardex.ts (módulo Reportes)
 * Cálculo del kardex: entrada, salida y saldo acumulado de cada movimiento
 * de un producto en una ubicación. Es una función pura (no depende de React),
 * por eso se puede probar con Vitest.
 */
import type { FilaMovimiento } from './tipos'

/** Movimiento del kardex con sus columnas calculadas. */
export interface FilaKardex extends FilaMovimiento {
  entrada: number // lo que entró a la ubicación (unidad base)
  salida: number // lo que salió de la ubicación (unidad base)
  saldo: number // saldo después de este movimiento
}

/**
 * calcularKardex: recorre los movimientos en orden y calcula el saldo acumulado.
 * @param filas       Movimientos aprobados del producto, ordenados por fecha.
 * @param ubicacionId Ubicación del kardex.
 * @returns Los mismos movimientos con entrada, salida y saldo.
 */
export function calcularKardex(filas: FilaMovimiento[], ubicacionId: number | null): FilaKardex[] {
  const resultado: FilaKardex[] = []
  let saldo = 0
  for (const f of filas) {
    const entrada = f.ubicacion_destino_id === ubicacionId ? f.cantidad : 0
    const salida = f.ubicacion_origen_id === ubicacionId ? f.cantidad : 0
    saldo += entrada - salida
    resultado.push({ ...f, entrada, salida, saldo })
  }
  return resultado
}