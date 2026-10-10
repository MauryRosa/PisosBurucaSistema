// Pruebas del formato impreso de documentos y de los textos de fecha de reportes
import { describe, expect, it } from 'vitest'
import { formatearFecha, textoPeriodo } from '@/lib/fechas'
import { copiasImpresas, firmasImpresas, tituloImpreso } from './formatoOrden'

describe('formato impreso', () => {
  it('las salidas llevan original para el cliente y copia para bodega', () => {
    expect(tituloImpreso('salida_venta')).toBe('Orden de salida')
    expect(copiasImpresas('salida_venta')).toEqual(['Original · Cliente', 'Copia · Bodega'])
  })

  it('la merma lleva las tres firmas de autorización', () => {
    expect(firmasImpresas('merma')).toHaveLength(3)
    expect(copiasImpresas('merma')).toEqual(['Original'])
  })
})

describe('fechas de reportes', () => {
  it('muestra fechas en formato de El Salvador', () => {
    expect(formatearFecha('2026-10-09')).toBe('09/10/2026')
    expect(textoPeriodo('2026-10-01', '2026-10-09')).toBe('Del 01/10/2026 al 09/10/2026')
  })
})
