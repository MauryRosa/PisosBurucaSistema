// =====================================================================
// Textos de bienvenida del dashboard (saludo y fecha de hoy)
// =====================================================================

/**
 * Devuelve "Buenos días", "Buenas tardes" o "Buenas noches"
 * según la hora de la computadora.
 */
export function saludoSegunHora(fecha: Date = new Date()): string {
  const hora = fecha.getHours()
  if (hora < 12) return 'Buenos días'
  if (hora < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

/**
 * Devuelve la fecha de hoy en texto largo, por ejemplo
 * "Viernes, 9 de octubre de 2026".
 */
export function fechaLarga(fecha: Date = new Date()): string {
  const texto = new Intl.DateTimeFormat('es-SV', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fecha)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Devuelve el primer nombre de una persona ("María José" → "María"). */
export function primerNombre(nombre: string | undefined): string {
  return nombre?.trim().split(/\s+/)[0] ?? ''
}
