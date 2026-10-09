/**
 * roles.ts
 * Nombres visibles de los roles y menú de la aplicación.
 * Cada opción del menú indica qué roles la pueden ver y qué requerimientos cubre.
 */
import type { Rol } from '@/types'

/** Nombre de cada rol tal como se muestra en pantalla. */
export const NOMBRE_ROL: Record<Rol, string> = {
  administrador: 'Administrador',
  jefe_bodega: 'Jefe de bodega',
  vendedora: 'Vendedora',
}

/** Una opción del menú lateral. */
export interface OpcionMenu {
  ruta: string // dirección en el navegador, ej. "/salidas"
  titulo: string // texto en el menú
  roles: Rol[] // quiénes la pueden ver
  requerimientos: string // códigos del documento de requerimientos
  descripcion: string // qué hace el módulo
}

// Grupos de roles para no repetir listas
const TODOS: Rol[] = ['administrador', 'jefe_bodega', 'vendedora']
const BODEGA: Rol[] = ['administrador', 'jefe_bodega']
const ADMIN: Rol[] = ['administrador']

/** Menú completo. Cada módulo se irá construyendo en los siguientes pasos. */
export const MENU: OpcionMenu[] = [
  {
    ruta: '/inicio',
    titulo: 'Inicio',
    roles: TODOS,
    requerimientos: '—',
    descripcion: 'Pantalla de bienvenida.',
  },
  {
    ruta: '/stock',
    titulo: 'Consulta de stock',
    roles: TODOS,
    requerimientos: 'RF-36',
    descripcion: 'Stock físico, reservado y disponible por ubicación.',
  },
  {
    ruta: '/salidas',
    titulo: 'Salidas por venta',
    roles: BODEGA,
    requerimientos: 'RF-15 a RF-18, RF-29 a RF-32',
    descripcion: 'Órdenes de salida ligadas a factura o recibo.',
  },
  {
    ruta: '/reservas',
    titulo: 'Reservas',
    roles: BODEGA,
    requerimientos: 'RF-26 a RF-28',
    descripcion: 'Producto apartado a pedido de una vendedora.',
  },
  {
    ruta: '/traslados',
    titulo: 'Traslados',
    roles: BODEGA,
    requerimientos: 'RF-19',
    descripcion: 'De bodega principal a minibodega.',
  },
  {
    ruta: '/entradas',
    titulo: 'Entradas',
    roles: BODEGA,
    requerimientos: 'RF-09 a RF-14',
    descripcion: 'Recepción de proveedor, devoluciones e inventario inicial.',
  },
  {
    ruta: '/movimientos',
    titulo: 'Mermas y otros',
    roles: BODEGA,
    requerimientos: 'RF-20 a RF-25',
    descripcion: 'Mermas, consumo interno, exhibición, devoluciones y cambios.',
  },
  {
    ruta: '/conteos',
    titulo: 'Conteos físicos',
    roles: BODEGA,
    requerimientos: 'RF-37',
    descripcion: 'Comparar lo contado contra el sistema.',
  },
  {
    ruta: '/pedidos',
    titulo: 'Órdenes de pedido',
    roles: TODOS,
    requerimientos: 'RF-09',
    descripcion: 'Pedidos a proveedor.',
  },
  {
    ruta: '/reportes',
    titulo: 'Reportes',
    roles: BODEGA,
    requerimientos: 'RF-38, RF-39',
    descripcion: 'Reporte de salidas, kardex y Excel.',
  },
  {
    ruta: '/catalogo',
    titulo: 'Catálogo',
    roles: ADMIN,
    requerimientos: 'RF-01 a RF-08',
    descripcion: 'Productos, proveedores y ubicaciones.',
  },
  {
    ruta: '/usuarios',
    titulo: 'Usuarios',
    roles: ADMIN,
    requerimientos: 'RF-40, RF-41',
    descripcion: 'Usuarios, roles y bitácora.',
  },
]
