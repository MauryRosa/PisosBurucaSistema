/**
 * api.ts (módulo Movimientos)
 * Documentos pendientes de aprobación, aprobación y anulación de documentos
 * (RF-20, RF-25) y búsqueda de un documento por su número.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EstadoDocumento, TipoComprobante, TipoDocumento } from '@/lib/documentos'
import { supabase } from '@/lib/supabase'
import type { TipoProducto } from '@/lib/unidades'

/** Línea de un documento con su producto. */
interface LineaConProducto {
  cantidad: number
  ubicacion_origen_id: number | null
  ubicacion_destino_id: number | null
  productos: { nombre: string; tipo: TipoProducto; unidad: string; piezas_por_caja: number | null }
}

/** Documento con datos suficientes para revisarlo, aprobarlo o anularlo. */
export interface DocumentoRevision {
  id: number
  numero: string
  tipo: TipoDocumento
  estado: EstadoDocumento
  fecha: string
  motivo: string | null
  evidencia_url: string | null
  tipo_comprobante: TipoComprobante | null
  numero_comprobante: string | null
  creador: { nombre: string } | null
  detalle_documento: LineaConProducto[]
}

/** Columnas que se piden a la base de datos para un DocumentoRevision. */
const COLUMNAS = `id, numero, tipo, estado, fecha, motivo, evidencia_url,
  tipo_comprobante, numero_comprobante,
  creador:perfiles!documentos_creado_por_fkey(nombre),
  detalle_documento(cantidad, ubicacion_origen_id, ubicacion_destino_id,
    productos(nombre, tipo, unidad, piezas_por_caja))`

/**
 * usePendientes: documentos que esperan aprobación de gerencia (mermas, ajustes),
 * los más antiguos primero.
 */
export function usePendientes() {
  return useQuery({
    queryKey: ['documentos', 'pendientes'],
    queryFn: async (): Promise<DocumentoRevision[]> => {
      const { data, error } = await supabase
        .from('documentos')
        .select(COLUMNAS)
        .eq('estado', 'pendiente')
        .order('fecha')
      if (error) throw error
      return data as unknown as DocumentoRevision[]
    },
  })
}

/**
 * buscarDocumentoPorNumero: busca un documento por su número (ej. VEN-2026-00001).
 * @returns El documento, o null si no existe.
 */
export async function buscarDocumentoPorNumero(numero: string): Promise<DocumentoRevision | null> {
  const { data, error } = await supabase
    .from('documentos')
    .select(COLUMNAS)
    .eq('numero', numero.trim().toUpperCase())
    .maybeSingle()
  if (error) throw error
  return data as unknown as DocumentoRevision | null
}

/**
 * useRefrescarMovimientos: después de aprobar o anular cambian el stock,
 * los documentos y las reservas; esta función los vuelve a consultar.
 */
function useRefrescarMovimientos() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['documentos'] })
    queryClient.invalidateQueries({ queryKey: ['stock'] })
    queryClient.invalidateQueries({ queryKey: ['reservas'] })
  }
}

/**
 * useAprobarDocumento: el administrador aprueba un documento pendiente.
 * Puede adjuntar la ruta de la carta firmada (evidencia).
 */
export function useAprobarDocumento() {
  const refrescar = useRefrescarMovimientos()
  return useMutation({
    mutationFn: async ({ id, evidencia }: { id: number; evidencia?: string }) => {
      const { error } = await supabase.rpc('aprobar_documento', {
        p_documento: id,
        p_evidencia_url: evidencia ?? null,
      })
      if (error) throw error
    },
    onSuccess: refrescar,
  })
}

/**
 * useAnularDocumento: el administrador anula un documento con motivo.
 * Si estaba aprobado, la base de datos revierte el stock.
 */
export function useAnularDocumento() {
  const refrescar = useRefrescarMovimientos()
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: number; motivo: string }) => {
      const { error } = await supabase.rpc('anular_documento', {
        p_documento: id,
        p_motivo: motivo,
      })
      if (error) throw error
    },
    onSuccess: refrescar,
  })
}
