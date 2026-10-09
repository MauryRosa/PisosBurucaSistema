/**
 * impresion.ts
 * Utilidades para imprimir documentos del sistema.
 */

/**
 * abrirImpresion: abre la orden de un documento en una pestaña nueva,
 * lista para imprimir o guardar en PDF (ruta /imprimir/:id).
 * @param documentoId Id del documento a imprimir.
 */
export function abrirImpresion(documentoId: number) {
  window.open(`/imprimir/${documentoId}`, '_blank')
}
