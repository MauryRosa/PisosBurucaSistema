/**
 * excel.ts
 * Exportación de datos a archivos de Excel (.xlsx) con SheetJS (RF-39).
 * La librería se carga solo cuando el usuario exporta, para que la
 * aplicación abra más rápido.
 */

/** Una fila del reporte: nombre de columna → valor. */
export type FilaExcel = Record<string, string | number | null>

/**
 * exportarExcel: crea y descarga un archivo .xlsx con una hoja.
 * Ajusta el ancho de cada columna al contenido más largo.
 * @param nombreArchivo Nombre del archivo sin extensión (ej. "salidas-2026-10").
 * @param nombreHoja    Nombre de la pestaña dentro del Excel.
 * @param filas         Datos a exportar (todas las filas con las mismas columnas).
 */
export async function exportarExcel(nombreArchivo: string, nombreHoja: string, filas: FilaExcel[]) {
  // Carga diferida de la librería
  const XLSX = await import('xlsx')

  const hoja = XLSX.utils.json_to_sheet(filas)

  // Ancho de columnas: el texto más largo de cada columna (mínimo 10, máximo 50)
  const columnas = Object.keys(filas[0] ?? {})
  hoja['!cols'] = columnas.map((col) => ({
    wch: Math.min(50, Math.max(10, col.length, ...filas.map((f) => String(f[col] ?? '').length))),
  }))

  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, nombreHoja.slice(0, 31)) // Excel permite 31 caracteres
  XLSX.writeFile(libro, `${nombreArchivo}.xlsx`)
}
