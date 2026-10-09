/**
 * kardex.test.ts
 * Pruebas del cálculo de saldos del kardex. Se ejecutan con: pnpm test
 */
import { describe, expect, it } from 'vitest'
import { calcularKardex } from './kardex'
import type { FilaMovimiento } from './tipos'

/**
 * mov: crea un movimiento de prueba con solo los datos que importan al kardex.
 */
function mov(origen: number | null, destino: number | null, cantidad: number): FilaMovimiento {
  return {
    ubicacion_origen_id: origen,
    ubicacion_destino_id: destino,
    cantidad,
  } as FilaMovimiento
}

describe('calcularKardex', () => {
  it('suma entradas, resta salidas y acumula el saldo', () => {
    const filas = [
      mov(null, 1, 21), // inventario inicial: entran 21 a la bodega 1
      mov(1, null, 4), // venta: salen 4
      mov(1, 2, 6), // traslado de la bodega 1 a la 2: salen 6 de la bodega 1
    ]
    const resultado = calcularKardex(filas, 1)
    expect(resultado.map((f) => f.saldo)).toEqual([21, 17, 11])
    expect(resultado[2]?.salida).toBe(6)
  })

  it('en la ubicación destino, el traslado cuenta como entrada', () => {
    const resultado = calcularKardex([mov(1, 2, 6)], 2)
    expect(resultado[0]?.entrada).toBe(6)
    expect(resultado[0]?.saldo).toBe(6)
  })
})