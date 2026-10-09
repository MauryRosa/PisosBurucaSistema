/**
 * tipos.ts (módulo Catálogo)
 * Tipos de datos de productos, proveedores y ubicaciones, y las reglas
 * de validación de sus formularios (RF-01 a RF-08).
 */
import { z } from 'zod'

/** Tipo de producto: piso (cajas y piezas) o accesorio (una sola unidad). */
export type TipoProducto = 'piso' | 'accesorio'

/** Cómo se despacha un producto (RF-03). */
export type FormaDespacho = 'caja' | 'pieza' | 'caja_y_pieza' | 'unidad'

/** Proveedor (tabla "proveedores"). */
export interface Proveedor {
  id: number
  nombre: string
  contacto: string | null
  telefono: string | null
  activo: boolean
  creado_en: string
}

/** Producto (tabla "productos") con el nombre de su proveedor. */
export interface Producto {
  id: number
  codigo: string
  nombre: string
  tipo: TipoProducto
  categoria: string
  medida: string | null
  unidad: string
  piezas_por_caja: number | null
  despacho: FormaDespacho
  stock_minimo: number
  proveedor_id: number | null
  activo: boolean
  creado_en: string
  proveedores: { nombre: string } | null // dato unido desde la tabla proveedores
}

/** Ubicación (tabla "ubicaciones"). */
export interface Ubicacion {
  id: number
  nombre: string
  es_principal: boolean
  activa: boolean
}

/** Unidades permitidas para accesorios (los pisos siempre usan "pieza"). */
export const UNIDADES_ACCESORIO = ['bolsa', 'unidad', 'galón', 'cubeta', 'rollo'] as const

/** Texto visible de cada forma de despacho. */
export const NOMBRE_DESPACHO: Record<FormaDespacho, string> = {
  caja: 'Solo caja',
  pieza: 'Solo pieza',
  caja_y_pieza: 'Caja y pieza',
  unidad: 'Por unidad',
}

/** Reglas del formulario de proveedor. */
export const esquemaProveedor = z.object({
  nombre: z.string().trim().min(2, 'Escriba el nombre'),
  contacto: z.string().trim(),
  telefono: z.string().trim(),
})
export type DatosProveedor = z.infer<typeof esquemaProveedor>

/**
 * Reglas del formulario de producto.
 * Las cantidades (stock mínimo) van en unidad base: piezas o unidades.
 */
export const esquemaProducto = z
  .object({
    codigo: z.string().trim().min(1, 'Escriba el código'),
    nombre: z.string().trim().min(2, 'Escriba el nombre'),
    tipo: z.enum(['piso', 'accesorio']),
    categoria: z.string().trim().min(2, 'Escriba la categoría'),
    medida: z.string().trim(),
    unidad: z.string().min(1, 'Elija la unidad'),
    piezas_por_caja: z
      .number({ error: 'Ingrese un número' })
      .int('Debe ser un número entero')
      .positive('Debe ser mayor a 0')
      .nullable(),
    despacho: z.enum(['caja', 'pieza', 'caja_y_pieza', 'unidad']),
    stock_minimo: z
      .number({ error: 'Ingrese un número' })
      .int('Debe ser un número entero')
      .min(0, 'No puede ser negativo'),
    proveedor_id: z.number().nullable(),
  })
  // Reglas que dependen del tipo de producto
  .superRefine((d, ctx) => {
    if (d.tipo === 'piso' && !d.piezas_por_caja) {
      ctx.addIssue({
        code: 'custom',
        path: ['piezas_por_caja'],
        message: 'Los pisos necesitan piezas por caja',
      })
    }
    if (d.tipo === 'piso' && d.despacho === 'unidad') {
      ctx.addIssue({ code: 'custom', path: ['despacho'], message: 'Elija caja, pieza o ambos' })
    }
  })
export type DatosProducto = z.infer<typeof esquemaProducto>
