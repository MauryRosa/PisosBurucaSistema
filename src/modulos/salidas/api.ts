/**
 * api.ts (módulo Salidas)
 * Consulta completa de un documento para imprimir su orden (RF-31).
 */
import { useQuery } from '@tanstack/react-query'
import type { EstadoDocumento, TipoComprobante, TipoDocumento } from '@/lib/documentos'
import { supabase } from '@/lib/supabase'
import type { TipoProducto } from '@/lib/unidades'

/** Documento con todo lo necesario para imprimirlo. */
export interface DocumentoImprimible {
  id: number
  numero: string
  tipo: TipoDocumento
  fecha: string
  estado: EstadoDocumento
  tipo_comprobante: TipoComprobante | null
  numero_comprobante: string | null
  retira_nombre: string | null
  retira_placa: string | null
  motivo: string | null
  motivo_anulacion: string | null
  documento_proveedor: string | null
  proveedores: { nombre: string } | null // proveedor (entradas y devoluciones)
  creador: { nombre: string } | null
  aprobador: { nombre: string } | null // quien aprobó (mermas y ajustes)
  detalle_documento: {
    cantidad: number
    origen: { nombre: string } | null
    destino: { nombre: string } | null
    productos: {
      codigo: string
      nombre: string
      tipo: TipoProducto
      unidad: string
      piezas_por_caja: number | null
    }
  }[]
}

/**
 * useDocumentoImprimible: trae un documento por id con sus líneas,
 * ubicaciones y el usuario que lo registró.
 */
export function useDocumentoImprimible(id: number) {
  return useQuery({
    queryKey: ['documento', id],
    enabled: Number.isFinite(id),
    queryFn: async (): Promise<DocumentoImprimible> => {
      const { data, error } = await supabase
        .from('documentos')
        .select(
          `id, numero, tipo, fecha, estado, tipo_comprobante, numero_comprobante,
           retira_nombre, retira_placa, motivo, motivo_anulacion, documento_proveedor,
           proveedores(nombre),
           creador:perfiles!documentos_creado_por_fkey(nombre),
           aprobador:perfiles!documentos_aprobado_por_fkey(nombre),
           detalle_documento(cantidad,
             origen:ubicaciones!detalle_documento_ubicacion_origen_id_fkey(nombre),
             destino:ubicaciones!detalle_documento_ubicacion_destino_id_fkey(nombre),
             productos(codigo, nombre, tipo, unidad, piezas_por_caja))`,
        )
        .eq('id', id)
        .single()
      if (error) throw error
      return data as unknown as DocumentoImprimible
    },
  })
}
