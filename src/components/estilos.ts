/**
 * estilos.ts
 * Clases de Tailwind reutilizables para que todos los formularios y botones
 * del sistema se vean iguales. Si se cambia aquí, cambia en todo el sistema.
 * Cada clase trae su versión para modo oscuro (prefijo "dark:") y usa los
 * colores de la marca (marca-rojo, marca-verde) definidos en src/index.css.
 */

/** Caja de texto, selector o número: fondo y letra legibles en claro y en oscuro. */
export const claseInput =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition focus:border-marca-rojo focus:ring-2 focus:ring-marca-rojo/20 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-900 dark:disabled:text-slate-500'

/** Botón principal (guardar, nuevo): rojo de la marca. */
export const claseBoton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-marca-rojo px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-marca-rojo-oscuro focus-visible:ring-2 focus-visible:ring-marca-rojo/40 focus-visible:outline-none disabled:opacity-60'

/** Botón secundario (cancelar). */
export const claseBotonSecundario =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'

/** Botón pequeño dentro de tablas (editar, activar). */
export const claseBotonTabla =
  'text-sm font-medium text-marca-rojo underline-offset-2 hover:underline dark:text-red-400'

/** Tabla de datos. */
export const claseTabla = 'w-full text-left text-sm'

/** Fila de encabezado de una tabla. */
export const claseEncabezado =
  'bg-slate-100 text-xs font-semibold tracking-wide text-slate-600 uppercase dark:bg-slate-800 dark:text-slate-300'

/** Celda de una tabla. */
export const claseCelda = 'px-3 py-2'
