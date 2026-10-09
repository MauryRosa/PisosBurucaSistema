// =====================================================================
// Íconos de la aplicación (trazos SVG de 24x24, estilo línea).
// Aquí solo están los datos; el componente que los dibuja es
// src/components/Icono.tsx.
// =====================================================================

/** Nombres de los íconos disponibles. */
export type NombreIcono =
  | 'inicio'
  | 'stock'
  | 'salidas'
  | 'reservas'
  | 'traslados'
  | 'entradas'
  | 'movimientos'
  | 'conteos'
  | 'pedidos'
  | 'reportes'
  | 'catalogo'
  | 'usuarios'
  | 'alerta'
  | 'sol'
  | 'luna'
  | 'salir'
  | 'menu'
  | 'cerrar'
  | 'flecha'
  | 'check'

/** Trazos (atributo "d" de <path>) de cada ícono. Un ícono puede tener varios. */
export const TRAZOS: Record<NombreIcono, string[]> = {
  inicio: ['M3 10.5 12 3l9 7.5', 'M5 9.5V21h5v-6h4v6h5V9.5'],
  stock: ['M21 8 12 3 3 8v8l9 5 9-5V8Z', 'M3 8l9 5 9-5', 'M12 13v8'],
  salidas: [
    'M3 7h11v10H3z',
    'M14 10h4l3 3v4h-7',
    'M7 17.5a1.5 1.5 0 1 0 0 .01',
    'M17 17.5a1.5 1.5 0 1 0 0 .01',
  ],
  reservas: ['M6 3h12v18l-6-4-6 4V3Z'],
  traslados: ['M4 8h13', 'M13 4l4 4-4 4', 'M20 16H7', 'M11 12l-4 4 4 4'],
  entradas: ['M12 3v12', 'M7 10l5 5 5-5', 'M4 17v3h16v-3'],
  movimientos: ['M4 6h16', 'M4 12h10', 'M4 18h6', 'M17 14l3 3-3 3'],
  conteos: ['M9 4h6v3H9z', 'M7 5H5v16h14V5h-2', 'M9 13l2 2 4-4'],
  pedidos: [
    'M4 4h2l2.5 11h10L21 7H7',
    'M10 19.5a1.5 1.5 0 1 0 0 .01',
    'M17 19.5a1.5 1.5 0 1 0 0 .01',
  ],
  reportes: ['M4 20V4', 'M4 20h16', 'M8 16v-5', 'M12 16V8', 'M16 16v-3'],
  catalogo: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  usuarios: [
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    'M2 21v-1a6 6 0 0 1 12 0v1',
    'M16 3.5a4 4 0 0 1 0 7',
    'M22 21v-1a6 6 0 0 0-4-5.6',
  ],
  alerta: ['M12 3 2 20h20L12 3Z', 'M12 10v4', 'M12 17v.01'],
  sol: [
    'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    'M12 2v2',
    'M12 20v2',
    'M4.9 4.9l1.4 1.4',
    'M17.7 17.7l1.4 1.4',
    'M2 12h2',
    'M20 12h2',
    'M4.9 19.1l1.4-1.4',
    'M17.7 6.3l1.4-1.4',
  ],
  luna: ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z'],
  salir: ['M15 4h4v16h-4', 'M10 8l-4 4 4 4', 'M6 12h11'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  cerrar: ['M6 6l12 12', 'M18 6 6 18'],
  flecha: ['M5 12h14', 'M13 6l6 6-6 6'],
  check: ['M5 12l4 4 10-10'],
}

/**
 * Ícono que corresponde a cada ruta del menú (src/lib/roles.ts).
 * Si una ruta no está aquí, el menú usa el ícono de "inicio".
 */
export const ICONO_DE_RUTA: Record<string, NombreIcono> = {
  '/inicio': 'inicio',
  '/stock': 'stock',
  '/salidas': 'salidas',
  '/reservas': 'reservas',
  '/traslados': 'traslados',
  '/entradas': 'entradas',
  '/movimientos': 'movimientos',
  '/conteos': 'conteos',
  '/pedidos': 'pedidos',
  '/reportes': 'reportes',
  '/catalogo': 'catalogo',
  '/usuarios': 'usuarios',
}

/** Devuelve el ícono de una ruta del menú. */
export function iconoDeRuta(ruta: string): NombreIcono {
  return ICONO_DE_RUTA[ruta] ?? 'inicio'
}
