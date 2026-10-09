/**
 * estilos.ts
 * Clases de Tailwind reutilizables para que todos los formularios y botones
 * del sistema se vean iguales. Si se cambia aquí, cambia en todo el sistema.
 */

/** Caja de texto, selector o número. */
export const claseInput =
  'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100'

/** Botón principal (guardar, nuevo). */
export const claseBoton =
  'rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60'

/** Botón secundario (cancelar). */
export const claseBotonSecundario =
  'rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-100'

/** Botón pequeño dentro de tablas (editar, activar). */
export const claseBotonTabla = 'text-sm text-slate-700 underline hover:text-slate-900'

/** Tabla de datos. */
export const claseTabla = 'w-full text-left text-sm'
export const claseEncabezado = 'bg-slate-100 text-slate-600'
export const claseCelda = 'px-3 py-2'
