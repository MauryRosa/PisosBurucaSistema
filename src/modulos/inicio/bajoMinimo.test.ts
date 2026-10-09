// Pruebas del cálculo de productos bajo stock mínimo (dashboard de Inicio)
import { describe, expect, it } from 'vitest'
import { calcularBajoMinimo, nivelAlerta, textoCantidad, type FilaStockMinimo } from './bajoMinimo'

/** Crea una fila de v_stock de prueba con valores por defecto. */
function fila(datos: Partial<FilaStockMinimo>): FilaStockMinimo {
  return {
    producto_id: 1,
    codigo: 'P-001',
    nombre: 'Porcelanato gris 60x60',
    piezas_por_caja: 4,
    stock_minimo: 40,
    disponible: 0,
    ...datos,
  }
}

describe('calcularBajoMinimo', () => {
  it('suma el disponible de todas las ubicaciones del producto', () => {
    // 20 en bodega + 15 en minibodega = 35 < 40 → aparece con faltante 5
    const resultado = calcularBajoMinimo([fila({ disponible: 20 }), fila({ disponible: 15 })])
    expect(resultado).toHaveLength(1)
    expect(resultado[0].disponible).toBe(35)
    expect(resultado[0].faltante).toBe(5)
  })

  it('no incluye productos en o sobre el mínimo, ni sin mínimo', () => {
    const resultado = calcularBajoMinimo([
      fila({ producto_id: 1, disponible: 40 }), // justo en el mínimo
      fila({ producto_id: 2, stock_minimo: 0, disponible: 0 }), // sin mínimo
    ])
    expect(resultado).toHaveLength(0)
  })

  it('ordena del más crítico al menos crítico', () => {
    const resultado = calcularBajoMinimo([
      fila({ producto_id: 1, nombre: 'A', disponible: 30 }), // 75 %
      fila({ producto_id: 2, nombre: 'B', disponible: 0 }), // 0 %
    ])
    expect(resultado.map((p) => p.nombre)).toEqual(['B', 'A'])
  })
})

describe('textoCantidad', () => {
  it('muestra pisos en cajas y piezas totales', () => {
    expect(textoCantidad(21, 2)).toBe('Cajas 10 · Piezas 21')
  })

  it('muestra accesorios en unidades', () => {
    expect(textoCantidad(35, 1)).toBe('35 unidades')
    expect(textoCantidad(1, null)).toBe('1 unidad')
  })
})

describe('nivelAlerta', () => {
  it('distingue agotado, crítico y bajo', () => {
    const [producto] = calcularBajoMinimo([fila({ disponible: 1 })])
    expect(nivelAlerta(producto)).toBe('critico')
    expect(nivelAlerta({ ...producto, disponible: 0 })).toBe('agotado')
    expect(nivelAlerta({ ...producto, disponible: 25 })).toBe('bajo')
  })
})
