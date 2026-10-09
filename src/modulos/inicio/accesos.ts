// =====================================================================
// Accesos rápidos del dashboard de Inicio
// Cada rol ve sus tarjetas:
//   administrador y jefe de bodega → Stock, Salidas, Entradas, Usuarios
//   vendedora                      → Stock, Órdenes de pedido
// Además se respeta el menú (src/lib/roles.ts): si un rol no tiene
// permiso para entrar a un módulo, su tarjeta no aparece. Por eso el
// jefe de bodega no ve "Usuarios" (es solo del administrador).
// =====================================================================

import type { NombreIcono } from '@/lib/iconos'
import { MENU } from '@/lib/roles'
import type { Rol } from '@/types'

/** Color de acento de cada tarjeta (colores de la marca y neutros). */
export type ColorAcceso = 'verde' | 'rojo' | 'azul' | 'ambar'

/** Una tarjeta de acceso rápido. */
export type Acceso = {
  ruta: string
  titulo: string
  descripcion: string
  icono: NombreIcono
  color: ColorAcceso
}

/** Todas las tarjetas posibles del dashboard. */
const ACCESOS: Record<string, Acceso> = {
  '/stock': {
    ruta: '/stock',
    titulo: 'Consultar stock',
    descripcion: 'Existencias en cajas y piezas por ubicación.',
    icono: 'stock',
    color: 'verde',
  },
  '/salidas': {
    ruta: '/salidas',
    titulo: 'Salidas por venta',
    descripcion: 'Despachar con factura o recibo e imprimir la orden.',
    icono: 'salidas',
    color: 'rojo',
  },
  '/entradas': {
    ruta: '/entradas',
    titulo: 'Entradas',
    descripcion: 'Compras, devoluciones e inventario inicial.',
    icono: 'entradas',
    color: 'azul',
  },
  '/usuarios': {
    ruta: '/usuarios',
    titulo: 'Usuarios',
    descripcion: 'Crear usuarios, roles y contraseñas.',
    icono: 'usuarios',
    color: 'ambar',
  },
  '/pedidos': {
    ruta: '/pedidos',
    titulo: 'Órdenes de pedido',
    descripcion: 'Pedir producto al proveedor y ver su estado.',
    icono: 'pedidos',
    color: 'rojo',
  },
}

/** Rutas de las tarjetas que ve cada rol, en el orden en que se muestran. */
const RUTAS_POR_ROL: Record<Rol, string[]> = {
  administrador: ['/stock', '/salidas', '/entradas', '/usuarios'],
  jefe_bodega: ['/stock', '/salidas', '/entradas', '/usuarios'],
  vendedora: ['/stock', '/pedidos'],
}

/**
 * Indica si un rol puede entrar a una ruta, según el menú del sistema.
 * Es la misma regla que usa el menú lateral.
 */
export function puedeEntrar(rol: Rol, ruta: string): boolean {
  return MENU.some((opcion) => opcion.ruta === ruta && opcion.roles.includes(rol))
}

/**
 * Devuelve las tarjetas de acceso rápido de un rol,
 * quitando las de módulos a los que ese rol no tiene permiso.
 */
export function accesosDeRol(rol: Rol): Acceso[] {
  return RUTAS_POR_ROL[rol].filter((ruta) => puedeEntrar(rol, ruta)).map((ruta) => ACCESOS[ruta])
}

/**
 * Clases de Tailwind de cada color de tarjeta (fondo del ícono y borde
 * al pasar el mouse). Van completas para que Tailwind las detecte.
 */
export const ESTILO_COLOR: Record<ColorAcceso, { icono: string; borde: string }> = {
  verde: {
    icono: 'bg-marca-verde-claro text-marca-verde dark:bg-marca-verde/15 dark:text-green-400',
    borde: 'hover:border-marca-verde/60',
  },
  rojo: {
    icono: 'bg-marca-rojo-claro text-marca-rojo dark:bg-marca-rojo/15 dark:text-red-400',
    borde: 'hover:border-marca-rojo/60',
  },
  azul: {
    icono: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
    borde: 'hover:border-sky-500/60',
  },
  ambar: {
    icono: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    borde: 'hover:border-amber-500/60',
  },
}
