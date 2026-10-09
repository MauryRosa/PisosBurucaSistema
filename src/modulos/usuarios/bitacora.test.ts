/**
 * bitacora.test.ts
 * Pruebas de las funciones de la bitácora. Se ejecutan con: pnpm test
 */
import { describe, expect, it } from 'vitest'
import { camposCambiados, resumenRegistro, valorTexto } from './bitacora'

describe('camposCambiados', () => {
  it('devuelve solo los campos que cambiaron', () => {
    const antes = { id: 1, nombre: 'María', rol: 'vendedora' }
    const despues = { id: 1, nombre: 'María', rol: 'jefe_bodega' }
    expect(camposCambiados(antes, despues)).toEqual([
      { campo: 'rol', antes: 'vendedora', despues: 'jefe_bodega' },
    ])
  })

  it('en altas y borrados no hay comparación', () => {
    expect(camposCambiados(null, { id: 1 })).toEqual([])
  })
})

describe('resumenRegistro y valorTexto', () => {
  it('usa el número, código o nombre del registro', () => {
    expect(resumenRegistro(null, { numero: 'VEN-2026-00001' })).toBe('VEN-2026-00001')
    expect(resumenRegistro({ codigo: 'POR-1' }, null)).toBe('POR-1')
  })

  it('muestra un guion para valores vacíos', () => {
    expect(valorTexto(null)).toBe('—')
    expect(valorTexto(5)).toBe('5')
  })
})
