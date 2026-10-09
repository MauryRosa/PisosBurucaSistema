// =====================================================================
// Tema claro / oscuro
// El tema se aplica poniendo o quitando la clase "dark" en <html>
// (ver @custom-variant en src/index.css) y se guarda en el navegador.
// index.html aplica el tema guardado al cargar, con la misma clave.
// =====================================================================

/** Los dos temas disponibles. */
export type Tema = 'claro' | 'oscuro'

/** Clave con la que se guarda la preferencia en el navegador. */
const CLAVE_TEMA = 'pb-tema'

/**
 * Devuelve el tema que está aplicado en este momento,
 * revisando si <html> tiene la clase "dark".
 */
export function temaActual(): Tema {
  return document.documentElement.classList.contains('dark') ? 'oscuro' : 'claro'
}

/**
 * Aplica un tema a toda la página y lo guarda para la próxima visita.
 * Si el navegador no permite guardar (modo privado), el tema igual se aplica.
 */
export function aplicarTema(tema: Tema): void {
  document.documentElement.classList.toggle('dark', tema === 'oscuro')
  try {
    localStorage.setItem(CLAVE_TEMA, tema)
  } catch {
    // Sin almacenamiento disponible: solo dura mientras la página esté abierta
  }
}

/** Devuelve el tema contrario al indicado (para el botón de cambiar). */
export function temaContrario(tema: Tema): Tema {
  return tema === 'oscuro' ? 'claro' : 'oscuro'
}
