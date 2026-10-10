/**
 * fechas.ts
 * Utilidades de fechas para filtros de reportes.
 * Las fechas de los filtros van como texto "AAAA-MM-DD" (lo que usa <input type="date">)
 * y se convierten al rango completo del día en hora local (El Salvador).
 */

/**
 * aTextoFecha: convierte una fecha a "AAAA-MM-DD" usando la hora local.
 */
function aTextoFecha(fecha: Date): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

/** hoyLocal: fecha de hoy como "AAAA-MM-DD". */
export function hoyLocal(): string {
  return aTextoFecha(new Date())
}

/** inicioDeMes: primer día del mes actual como "AAAA-MM-DD". */
export function inicioDeMes(): string {
  const hoy = new Date()
  return aTextoFecha(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
}

/** inicioDelDia: "AAAA-MM-DD" → instante 00:00:00 local, en formato ISO para la base de datos. */
export function inicioDelDia(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toISOString()
}

/** finDelDia: "AAAA-MM-DD" → instante 23:59:59.999 local, en formato ISO. */
export function finDelDia(fecha: string): string {
  return new Date(`${fecha}T23:59:59.999`).toISOString()
}

/** formatearFechaHora: fecha y hora legibles en español de El Salvador. */
export function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-SV')
}

/**
 * formatearFecha: convierte "2026-10-09" en "09/10/2026" (formato de El Salvador).
 * Se usa en títulos y periodos de los reportes.
 */
export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

/** textoPeriodo: "Del 01/10/2026 al 09/10/2026" para el encabezado de reportes. */
export function textoPeriodo(desde: string, hasta: string): string {
  return `Del ${formatearFecha(desde)} al ${formatearFecha(hasta)}`
}
