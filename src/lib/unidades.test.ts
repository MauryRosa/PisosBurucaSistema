/**
 * unidades.test.ts
 * Pruebas automáticas de la conversión de unidades.
 * Se ejecutan con: pnpm test
 */
import { describe, expect, it } from 'vitest'
import { aUnidadBase, desglosar, formatearStock, type ProductoUnidades } from './unidades'

// Productos de ejemplo
const porcelanato: ProductoUnidades = { tipo: 'piso', unidad: 'pieza', piezas_por_caja: 2 }
const pegamento: ProductoUnidades = { tipo: 'accesorio', unidad: 'bolsa', piezas_por_caja: null }

describe('aUnidadBase', () => {
  it('convierte cajas + piezas a piezas', () => {
    expect(aUnidadBase(porcelanato, { cajas: 5, piezas: 1 })).toBe(11)
  })

  it('acepta solo cajas o solo piezas', () => {
    expect(aUnidadBase(porcelanato, { cajas: 10 })).toBe(20)
    expect(aUnidadBase(porcelanato, { piezas: 3 })).toBe(3)
  })

  it('los accesorios se capturan por unidad', () => {
    expect(aUnidadBase(pegamento, { piezas: 12 })).toBe(12)
    expect(() => aUnidadBase(pegamento, { cajas: 1 })).toThrow()
  })

  it('rechaza decimales y negativos', () => {
    expect(() => aUnidadBase(porcelanato, { cajas: 1.5 })).toThrow()
    expect(() => aUnidadBase(porcelanato, { piezas: -1 })).toThrow()
  })
})

describe('desglosar y formatearStock', () => {
  it('10 cajas de 2 piezas = Cajas 10 · Piezas 20', () => {
    expect(formatearStock(porcelanato, 20)).toBe('Cajas 10 · Piezas 20')
  })

  it('10 cajas + 1 pieza suelta = Cajas 10 · Piezas 21', () => {
    expect(formatearStock(porcelanato, 21)).toBe('Cajas 10 · Piezas 21')
    expect(desglosar(porcelanato, 21)).toEqual({ cajas: 10, piezasTotales: 21, piezasSueltas: 1 })
  })

  it('los accesorios se muestran en su unidad', () => {
    expect(formatearStock(pegamento, 12)).toBe('12 bolsa')
  })
})
