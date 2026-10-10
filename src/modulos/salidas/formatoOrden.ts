/**
 * formatoOrden.ts
 * Reglas del formato impreso de cada tipo de documento (RF-31):
 * título, copias que se imprimen y firmas que lleva.
 * Solo datos y funciones puras; la pantalla está en ImprimirOrden.tsx.
 */
import type { TipoDocumento } from '@/lib/documentos'

/** Título grande del documento impreso según su tipo. */
export function tituloImpreso(tipo: TipoDocumento): string {
  switch (tipo) {
    case 'salida_venta':
    case 'despacho_minibodega':
      return 'Orden de salida'
    case 'traslado':
      return 'Orden de traslado'
    case 'entrada_compra':
    case 'entrada_devolucion_cliente':
    case 'inventario_inicial':
      return 'Nota de entrada'
    case 'merma':
      return 'Acta de merma'
    case 'ajuste':
      return 'Ajuste de inventario'
    default:
      return 'Comprobante de movimiento'
  }
}

/**
 * copiasImpresas: etiquetas de las copias que se imprimen.
 * Las salidas llevan original para el cliente y copia para bodega (ambas firmadas).
 */
export function copiasImpresas(tipo: TipoDocumento): string[] {
  switch (tipo) {
    case 'salida_venta':
    case 'despacho_minibodega':
      return ['Original · Cliente', 'Copia · Bodega']
    case 'traslado':
      return ['Original · Bodega principal', 'Copia · Minibodega']
    default:
      return ['Original']
  }
}

/** firmasImpresas: líneas de firma al pie del documento según su tipo. */
export function firmasImpresas(tipo: TipoDocumento): string[] {
  switch (tipo) {
    case 'salida_venta':
    case 'despacho_minibodega':
      return ['Entregó (bodega)', 'Recibió conforme (cliente o transportista)']
    case 'traslado':
      return ['Despachó (bodega principal)', 'Recibió (minibodega)']
    case 'entrada_compra':
    case 'entrada_devolucion_cliente':
      return ['Entregó (proveedor o cliente)', 'Recibió (bodega)']
    case 'devolucion_proveedor':
      return ['Entregó (bodega)', 'Recibió (proveedor)']
    case 'merma':
      return ['Encargado de bodega', 'Contador', 'Gerencia']
    default:
      return ['Elaboró', 'Autorizó']
  }
}
