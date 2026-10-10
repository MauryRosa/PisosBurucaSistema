/**
 * excel.ts
 * Exportación de reportes a Excel (.xlsx) con formato profesional (RF-39):
 *   - Encabezado con el logo y los datos de la empresa (src/lib/empresa.ts).
 *   - Título del reporte, periodo o filtros y fecha de generación.
 *   - Tabla con encabezados en gris, filas alternadas, bordes finos,
 *     filtros por columna y encabezado fijo al desplazarse.
 *   - Lista para imprimir: hoja carta, ajustada al ancho y con número de página.
 * Usa la librería ExcelJS, que se carga solo cuando el usuario exporta,
 * para que la aplicación abra más rápido.
 */
// Solo tipos: no se incluyen en la aplicación, la librería se carga al exportar
import type { Font, Workbook, Worksheet } from 'exceljs'
import { EMPRESA, LOGO_DOCUMENTOS, lineasEmpresa } from '@/lib/empresa'

/** Una fila del reporte: nombre de columna → valor. */
export type FilaExcel = Record<string, string | number | null | undefined>

/** Datos opcionales del encabezado del reporte. */
export interface OpcionesExcel {
  titulo?: string // título grande (por defecto, el nombre de la hoja)
  subtitulo?: string // periodo o filtros, ej. "Del 2026-10-01 al 2026-10-09"
}

// Colores sobrios en formato ARGB (los que usa Excel): grises y gris oscuro
const OSCURO = 'FF1E293B' // texto del nombre y del título
const GRIS_ENCABEZADO = 'FFE2E8F0' // fondo de los encabezados de la tabla
const GRIS_LINEA = 'FF94A3B8' // línea bajo el encabezado del documento
const GRIS_TEXTO = 'FF64748B'
const GRIS_BORDE = 'FFE2E8F0'
const GRIS_FILA = 'FFF8FAFC'

// Fila donde empieza la tabla (las de arriba son el encabezado del documento)
const FILA_ENCABEZADOS = 9

/**
 * exportarExcel: crea y descarga un archivo .xlsx con una hoja con formato.
 * @param nombreArchivo Nombre del archivo sin extensión (ej. "salidas-2026-10").
 * @param nombreHoja    Nombre de la pestaña dentro del Excel.
 * @param filas         Datos a exportar (todas las filas con las mismas columnas).
 * @param opciones      Título y subtítulo del reporte (opcionales).
 */
export async function exportarExcel(
  nombreArchivo: string,
  nombreHoja: string,
  filas: FilaExcel[],
  opciones: OpcionesExcel = {},
) {
  // Carga diferida de la librería (según cómo la empaquete Vite, viene
  // como "default" o directamente en el módulo; se aceptan las dos formas)
  const modulo = await import('exceljs')
  const ExcelJS = modulo.default ?? modulo

  const libro = new ExcelJS.Workbook()
  libro.creator = `${EMPRESA.nombre} · Inventario`
  libro.created = new Date()

  const columnas = Object.keys(filas[0] ?? {})
  const totalColumnas = Math.max(columnas.length, 4) // el encabezado ocupa al menos 4 columnas
  const titulo = opciones.titulo ?? nombreHoja

  const hoja = libro.addWorksheet(nombreHoja.slice(0, 31), {
    // Excel permite 31 caracteres
    views: [{ state: 'frozen', ySplit: FILA_ENCABEZADOS, showGridLines: false }],
    pageSetup: {
      // Sin "paperSize": Excel usa hoja carta, que es su tamaño por defecto
      orientation: columnas.length > 6 ? 'landscape' : 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.3, footer: 0.3 },
      printTitlesRow: `${FILA_ENCABEZADOS}:${FILA_ENCABEZADOS}`,
    },
    headerFooter: {
      oddFooter: `&L&8${EMPRESA.nombre} · ${titulo}&R&8Página &P de &N`,
    },
  })

  // ---------- Encabezado del documento ----------
  await agregarLogo(libro, hoja)

  /** escribir: pone un texto en la columna B de una fila (unida hasta la última columna). */
  const escribir = (fila: number, texto: string, fuente: Partial<Font>) => {
    hoja.mergeCells(fila, 2, fila, totalColumnas)
    const celda = hoja.getCell(fila, 2)
    celda.value = texto
    celda.font = { name: 'Calibri', ...fuente }
    celda.alignment = { vertical: 'middle' }
  }

  // Filas 1 a 4: nombre y datos de la empresa (junto al logo)
  escribir(1, EMPRESA.nombre.toUpperCase(), { size: 16, bold: true, color: { argb: OSCURO } })
  const datos = lineasEmpresa()
  escribir(2, datos[0] ?? '', { size: 9, color: { argb: GRIS_TEXTO } })
  escribir(3, datos[1] ?? '', { size: 9, color: { argb: GRIS_TEXTO } })
  escribir(4, datos.slice(2).join(' · '), { size: 9, color: { argb: GRIS_TEXTO } })
  hoja.getRow(1).height = 26

  // Fila 5: línea fina gris que separa el encabezado de la empresa
  hoja.getRow(5).height = 6
  for (let col = 1; col <= totalColumnas; col++) {
    hoja.getCell(5, col).border = { bottom: { style: 'thin', color: { argb: GRIS_LINEA } } }
  }

  // Filas 6 a 8: título, subtítulo y fecha de generación
  const tituloCelda = hoja.getCell(6, 1)
  hoja.mergeCells(6, 1, 6, totalColumnas)
  tituloCelda.value = titulo
  tituloCelda.font = { name: 'Calibri', size: 14, bold: true, color: { argb: OSCURO } }
  hoja.getRow(6).height = 24

  hoja.mergeCells(7, 1, 7, totalColumnas)
  hoja.getCell(7, 1).value = opciones.subtitulo ?? ''
  hoja.getCell(7, 1).font = { name: 'Calibri', size: 10, italic: true, color: { argb: GRIS_TEXTO } }

  hoja.mergeCells(8, 1, 8, totalColumnas)
  hoja.getCell(8, 1).value =
    `Generado el ${new Date().toLocaleString('es-SV')} · ${filas.length} registro(s)`
  hoja.getCell(8, 1).font = { name: 'Calibri', size: 9, color: { argb: GRIS_TEXTO } }

  // ---------- Tabla ----------
  if (columnas.length === 0) {
    hoja.getCell(FILA_ENCABEZADOS, 1).value = 'No hay datos para el periodo o filtros elegidos.'
  } else {
    escribirTabla(hoja, columnas, filas)
  }

  // ---------- Descargar ----------
  const contenido = await libro.xlsx.writeBuffer()
  descargar(
    new Blob([contenido], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${nombreArchivo}.xlsx`,
  )
}

/**
 * escribirTabla: escribe encabezados y filas desde FILA_ENCABEZADOS, con
 * estilos, filtros y ancho de columnas según el contenido.
 */
function escribirTabla(hoja: Worksheet, columnas: string[], filas: FilaExcel[]) {
  const borde = { style: 'thin' as const, color: { argb: GRIS_BORDE } }
  const bordes = { top: borde, left: borde, bottom: borde, right: borde }

  // Encabezados: fondo gris claro y letra oscura en negrita
  const encabezado = hoja.getRow(FILA_ENCABEZADOS)
  encabezado.values = columnas
  encabezado.height = 22
  encabezado.eachCell((celda) => {
    celda.font = { name: 'Calibri', size: 10, bold: true, color: { argb: OSCURO } }
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_ENCABEZADO } }
    celda.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    celda.border = bordes
  })

  // Filas de datos: alternadas en gris claro, números a la derecha con separador de miles
  filas.forEach((fila, i) => {
    const filaExcel = hoja.getRow(FILA_ENCABEZADOS + 1 + i)
    filaExcel.values = columnas.map((col) => fila[col] ?? '')
    filaExcel.eachCell({ includeEmpty: true }, (celda) => {
      celda.font = { name: 'Calibri', size: 10 }
      celda.border = bordes
      celda.alignment = { vertical: 'top', wrapText: true }
      if (typeof celda.value === 'number') {
        celda.numFmt = '#,##0'
        celda.alignment = { vertical: 'top', horizontal: 'right' }
      }
      if (i % 2 === 1) {
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_FILA } }
      }
    })
  })

  // Filtros en cada columna del encabezado
  hoja.autoFilter = {
    from: { row: FILA_ENCABEZADOS, column: 1 },
    to: { row: FILA_ENCABEZADOS, column: columnas.length },
  }

  // Ancho de columnas: el texto más largo de cada columna (mínimo 12, máximo 45)
  columnas.forEach((col, i) => {
    const largo = Math.max(col.length, ...filas.map((f) => String(f[col] ?? '').length))
    hoja.getColumn(i + 1).width = Math.min(45, Math.max(12, largo + 2))
  })
}

/**
 * agregarLogo: inserta el logo de la empresa en la esquina superior
 * izquierda (filas 1 a 4). Si no se puede cargar, el reporte sigue sin logo.
 */
async function agregarLogo(libro: Workbook, hoja: Worksheet) {
  try {
    const respuesta = await fetch(LOGO_DOCUMENTOS)
    const base64 = await blobABase64(await respuesta.blob())
    const imagen = libro.addImage({ base64, extension: 'png' })
    hoja.addImage(imagen, { tl: { col: 0.15, row: 0.15 }, ext: { width: 72, height: 72 } })
  } catch {
    // Sin logo: no se detiene la exportación
  }
}

/** blobABase64: convierte una imagen descargada a texto base64 (data URL). */
function blobABase64(blob: Blob): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onload = () => resolver(String(lector.result))
    lector.onerror = () => rechazar(lector.error)
    lector.readAsDataURL(blob)
  })
}

/** descargar: hace que el navegador descargue un archivo generado en memoria. */
function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  enlace.click()
  URL.revokeObjectURL(url)
}
