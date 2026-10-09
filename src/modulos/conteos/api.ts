/**
 * api.ts (módulo Conteos)
 * Lectura de conteos y llamadas a las funciones iniciar_conteo,
 * guardar_cantidad_contada, cerrar_conteo y cancelar_conteo (RF-37).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Conteo, LineaConteo } from './tipos'

/** useConteos: últimos 30 conteos, el más reciente primero. */
export function useConteos() {
  return useQuery({
    queryKey: ['conteos'],
    queryFn: async (): Promise<Conteo[]> => {
      const { data, error } = await supabase
        .from('conteos')
        .select(
          `id, ubicacion_id, categoria, notas, estado, documento_ajuste_id, creado_en, cerrado_en,
           ubicaciones(nombre),
           creador:perfiles!conteos_creado_por_fkey(nombre),
           ajuste:documentos!conteos_documento_ajuste_id_fkey(numero, estado)`,
        )
        .order('creado_en', { ascending: false })
        .limit(30)
      if (error) throw error
      return data as unknown as Conteo[]
    },
  })
}

/**
 * useLineasConteo: líneas de un conteo, ordenadas por nombre de producto.
 * @param conteoId Id del conteo.
 */
export function useLineasConteo(conteoId: number) {
  return useQuery({
    queryKey: ['conteo-lineas', conteoId],
    queryFn: async (): Promise<LineaConteo[]> => {
      const { data, error } = await supabase
        .from('detalle_conteo')
        .select(
          `id, producto_id, cantidad_sistema, cantidad_contada, diferencia,
           productos(codigo, nombre, tipo, unidad, piezas_por_caja)`,
        )
        .eq('conteo_id', conteoId)
      if (error) throw error
      const lineas = data as unknown as LineaConteo[]
      return lineas.sort((a, b) => a.productos.nombre.localeCompare(b.productos.nombre))
    },
  })
}

/** useIniciarConteo: crea un conteo y devuelve su id. */
export function useIniciarConteo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (datos: {
      ubicacion_id: number
      categoria: string | null
      notas: string | null
    }): Promise<number> => {
      const { data, error } = await supabase.rpc('iniciar_conteo', {
        p_ubicacion: datos.ubicacion_id,
        p_categoria: datos.categoria,
        p_notas: datos.notas,
      })
      if (error) throw error
      return data as number
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conteos'] }),
  })
}

/** useGuardarContado: guarda lo contado en una línea (unidad base). */
export function useGuardarContado(conteoId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ detalleId, cantidad }: { detalleId: number; cantidad: number }) => {
      const { error } = await supabase.rpc('guardar_cantidad_contada', {
        p_detalle: detalleId,
        p_cantidad: cantidad,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conteo-lineas', conteoId] }),
  })
}

/**
 * useCerrarConteo: cierra el conteo. Devuelve el id del ajuste creado,
 * o null si no hubo diferencias.
 */
export function useCerrarConteo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (conteoId: number): Promise<number | null> => {
      const { data, error } = await supabase.rpc('cerrar_conteo', { p_conteo: conteoId })
      if (error) throw error
      return (data as number | null) ?? null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conteos'] })
      queryClient.invalidateQueries({ queryKey: ['documentos'] })
    },
  })
}

/** useCancelarConteo: cancela un conteo abierto sin generar ajuste. */
export function useCancelarConteo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (conteoId: number) => {
      const { error } = await supabase.rpc('cancelar_conteo', { p_conteo: conteoId })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conteos'] }),
  })
}
