/**
 * empresa.ts
 * Datos de la empresa que aparecen en los documentos impresos (órdenes en PDF)
 * y en los reportes exportados a Excel.
 *
 * IMPORTANTE: complete aquí los datos reales. Los campos vacíos ('') no se
 * muestran en ningún documento, así que puede dejar en blanco los que no use.
 */

/** Datos generales de la empresa. */
export const EMPRESA = {
  nombre: 'Pisos Buruca', // nombre comercial (sale grande junto al logo)
  razonSocial: '', // nombre legal registrado en Hacienda, si es distinto
  giro: 'Terminación y acabados de edificios', // actividad económica, ej. "Venta de pisos y acabados para la construcción"
  nit: '1206-210476-101-2', // NIT de la empresa
  nrc: '182397-9', // número de registro de contribuyente (NRC)
  direccion: '', // dirección de la sala de ventas
  ciudad: 'San Miguel, El Salvador',
  telefono: '7515-5987', // ej. "2660-0000"
  whatsapp: '',
  correo: 'factpisosburuca@gmail.com',
  direccionBodega: '', // dirección de la bodega de despacho (sale en las órdenes de salida)
}

/** Ruta del logo para documentos (carpeta public). */
export const LOGO_DOCUMENTOS = '/logo-documentos.png'

/**
 * lineasEmpresa: devuelve los datos de contacto y registro en líneas cortas,
 * omitiendo los que estén vacíos. Se usa en el encabezado de los documentos.
 * Ej.: ["NIT 0000-000000-000-0 · NRC 000000-0", "Col. ..., San Miguel, El Salvador", "Tel. 2660-0000"]
 */
export function lineasEmpresa(): string[] {
  const registro = [EMPRESA.nit && `NIT ${EMPRESA.nit}`, EMPRESA.nrc && `NRC ${EMPRESA.nrc}`]
  const contacto = [
    EMPRESA.telefono && `Tel. ${EMPRESA.telefono}`,
    EMPRESA.whatsapp && `WhatsApp ${EMPRESA.whatsapp}`,
    EMPRESA.correo,
  ]
  return [
    EMPRESA.razonSocial,
    EMPRESA.giro,
    unir(registro),
    unir([EMPRESA.direccion, EMPRESA.ciudad]),
    unir(contacto),
  ].filter((linea) => linea !== '')
}

/** unir: junta con " · " los textos que no estén vacíos. */
function unir(partes: (string | false)[]): string {
  return partes.filter((p): p is string => Boolean(p)).join(' · ')
}
