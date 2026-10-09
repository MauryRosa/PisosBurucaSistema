/**
 * bitacora.ts (módulo Usuarios)
 * Funciones puras para mostrar la bitácora: qué campos cambiaron y un
 * resumen legible del registro afectado. Se prueban con Vitest.
 */

/** Un campo que cambió: su nombre, valor anterior y valor nuevo. */
export interface CambioCampo {
  campo: string
  antes: unknown
  despues: unknown
}

/**
 * camposCambiados: compara el valor anterior y el nuevo de un registro
 * y devuelve solo los campos que cambiaron.
 */
export function camposCambiados(
  anterior: Record<string, unknown> | null,
  nuevo: Record<string, unknown> | null,
): CambioCampo[] {
  if (!anterior || !nuevo) return []
  return Object.keys(nuevo)
    .filter((campo) => JSON.stringify(anterior[campo]) !== JSON.stringify(nuevo[campo]))
    .map((campo) => ({ campo, antes: anterior[campo], despues: nuevo[campo] }))
}

/**
 * valorTexto: convierte cualquier valor a texto para mostrarlo.
 */
export function valorTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return '—'
  if (typeof valor === 'object') return JSON.stringify(valor)
  return String(valor)
}

/**
 * resumenRegistro: dato principal del registro afectado
 * (número de documento, código de producto o nombre).
 */
export function resumenRegistro(
  anterior: Record<string, unknown> | null,
  nuevo: Record<string, unknown> | null,
): string {
  const datos = nuevo ?? anterior ?? {}
  const principal = datos.numero ?? datos.codigo ?? datos.nombre
  return principal ? valorTexto(principal) : ''
}
