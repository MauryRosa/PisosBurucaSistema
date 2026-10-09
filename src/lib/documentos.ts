/**
 * documentos.ts
 * Lógica compartida por todos los módulos que registran movimientos
 * (entradas, salidas, traslados, mermas…): tipos, nombres visibles,
 * creación de documentos y consulta del historial.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TipoProducto } from '@/lib/unidades'

/** Tipos de documento (deben coincidir con "tipo_documento" en la base de datos). */
export type TipoDocumento =
  | 'entrada_compra'
  | 'entrada_devolucion_cliente'
  | 'inventario_inicial'
  | 'salida_venta'
  | 'despacho_minibodega'
  | 'traslado'
  | 'merma'
  | 'consumo_interno'
  | 'exhibicion'
  | 'devolucion_proveedor'
  | 'cambio_garantia'
  | 'ajuste'

export type EstadoDocumento = 'pendiente' | 'aprobado' | 'anulado'
export type TipoComprobante = 'factura' | 'recibo'

/** Nombre visible de cada tipo de documento. */
export const NOMBRE_TIPO_DOCUMENTO: Record<TipoDocumento, string> = {
  entrada_compra: 'Compra a proveedor',
  entrada_devolucion_cliente: 'Devolución de cliente',
  inventario_inicial: 'Inventario inicial',
  salida_venta: 'Salida por venta',
  despacho_minibodega: 'Despacho de minibodega',
  traslado: 'Traslado',
  merma: 'Merma',
  consumo_interno: 'Consumo interno',
  exhibicion: 'Exhibición',
  devolucion_proveedor: 'Devolución a proveedor',
  cambio_garantia: 'Cambio / garantía',
  ajuste: 'Ajuste',
}

/** Una línea a guardar: producto, de dónde sale, a dónde entra y cantidad en unidad base. */
export interface LineaDocumento {
  producto_id: number
  ubicacion_origen_id: number | null // null = entra al inventario
  ubicacion_destino_id: number | null // null = sale del inventario
  cantidad: number
}

/** Datos opcionales de la cabecera (según el tipo de documento). */
export interface DatosDocumento {
  tipo_comprobante?: TipoComprobante
  numero_comprobante?: string
  proveedor_id?: number
  documento_proveedor?: string
  retira_nombre?: string
  retira_placa?: string
  motivo?: string
  evidencia_url?: string
  reserva_ids?: number[]
}

/**
 * useCrearDocumento: registra un movimiento llamando a la función
 * "crear_documento" de la base de datos. Devuelve el id y el número
 * del documento creado (ej. INI-2026-00002).
 * Al terminar, refresca el stock y los historiales.
 */
export function useCrearDocumento() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      tipo,
      lineas,
      datos,
    }: {
      tipo: TipoDocumento
      lineas: LineaDocumento[]
      datos?: DatosDocumento
    }) => {
      // 1. Crear el documento (todo o nada, en una transacción)
      const { data: id, error } = await supabase.rpc('crear_documento', {
        p_tipo: tipo,
        p_lineas: lineas,
        p_datos: datos ?? {},
      })
      if (error) throw error

      // 2. Leer su número para mostrarlo al usuario
      const { data: doc, error: errorDoc } = await supabase
        .from('documentos')
        .select('id, numero')
        .eq('id', id)
        .single()
      if (errorDoc) throw errorDoc
      return doc as { id: number; numero: string }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['documentos'] })
    },
  })
}

/** Documento con sus datos relacionados, para el historial. */
export interface DocumentoResumen {
  id: number
  numero: string
  tipo: TipoDocumento
  fecha: string
  estado: EstadoDocumento
  tipo_comprobante: TipoComprobante | null
  numero_comprobante: string | null
  documento_proveedor: string | null
  motivo: string | null
  retira_nombre: string | null
  proveedores: { nombre: string } | null
  creador: { nombre: string } | null
  detalle_documento: {
    cantidad: number
    ubicacion_origen_id: number | null
    ubicacion_destino_id: number | null
    productos: {
      nombre: string
      tipo: TipoProducto
      unidad: string
      piezas_por_caja: number | null
    }
  }[]
}

/**
 * useDocumentos: últimos documentos de ciertos tipos, con proveedor,
 * usuario que los registró y sus líneas con el producto.
 * @param tipos  Tipos de documento a mostrar.
 * @param limite Cuántos traer (los más recientes primero).
 */
export function useDocumentos(tipos: TipoDocumento[], limite = 20) {
  return useQuery({
    queryKey: ['documentos', tipos, limite],
    queryFn: async (): Promise<DocumentoResumen[]> => {
      const { data, error } = await supabase
        .from('documentos')
        .select(
          `id, numero, tipo, fecha, estado, tipo_comprobante, numero_comprobante,
           documento_proveedor, motivo, retira_nombre,
           proveedores(nombre),
           creador:perfiles!documentos_creado_por_fkey(nombre),
           detalle_documento(cantidad, ubicacion_origen_id, ubicacion_destino_id,
             productos(nombre, tipo, unidad, piezas_por_caja))`,
        )
        .in('tipo', tipos)
        .order('fecha', { ascending: false })
        .limit(limite)
      if (error) throw error
      return data as unknown as DocumentoResumen[]
    },
  })
}
