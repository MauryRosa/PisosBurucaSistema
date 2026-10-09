/**
 * api.ts (módulo Pedidos)
 * Lectura de órdenes y llamadas a crear_orden_pedido, cancelar_orden_pedido
 * y recibir_orden_pedido.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { OrdenPedido } from './tipos'

/** useOrdenes: últimas 50 órdenes de pedido, la más reciente primero. */
export function useOrdenes() {
  return useQuery({
    queryKey: ['ordenes'],
    queryFn: async (): Promise<OrdenPedido[]> => {
      const { data, error } = await supabase
        .from('ordenes_pedido')
        .select(
          `id, numero, estado, notas, motivo_cancelacion, creado_por, creado_en,
           proveedores(nombre),
           creador:perfiles!ordenes_pedido_creado_por_fkey(nombre),
           detalle_orden_pedido(id, producto_id, cantidad, cantidad_recibida,
             productos(codigo, nombre, tipo, unidad, piezas_por_caja))`,
        )
        .order('creado_en', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as unknown as OrdenPedido[]
    },
  })
}

/**
 * useCrearOrden: crea una orden y devuelve su número (ej. PED-2026-00001).
 */
export function useCrearOrden() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (datos: {
      proveedor_id: number
      lineas: { producto_id: number; cantidad: number }[]
      notas: string | null
    }): Promise<string> => {
      const { data: id, error } = await supabase.rpc('crear_orden_pedido', {
        p_proveedor: datos.proveedor_id,
        p_lineas: datos.lineas,
        p_notas: datos.notas,
      })
      if (error) throw error
      const { data, error: errorNumero } = await supabase
        .from('ordenes_pedido')
        .select('numero')
        .eq('id', id)
        .single()
      if (errorNumero) throw errorNumero
      return (data as { numero: string }).numero
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ordenes'] }),
  })
}

/** useCancelarOrden: cancela una orden pendiente con motivo. */
export function useCancelarOrden() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: number; motivo: string }) => {
      const { error } = await supabase.rpc('cancelar_orden_pedido', {
        p_orden: id,
        p_motivo: motivo,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ordenes'] }),
  })
}

/**
 * useRecibirOrden: registra lo recibido de una orden. Crea la entrada de
 * compra ligada y devuelve su id y número (ej. ENT-2026-00003).
 */
export function useRecibirOrden() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (datos: {
      orden_id: number
      lineas: { producto_id: number; cantidad: number }[]
      documento_proveedor: string
      ubicacion_id: number
    }): Promise<{ id: number; numero: string }> => {
      const { data: id, error } = await supabase.rpc('recibir_orden_pedido', {
        p_orden: datos.orden_id,
        p_lineas: datos.lineas,
        p_documento_proveedor: datos.documento_proveedor,
        p_ubicacion: datos.ubicacion_id,
      })
      if (error) throw error
      const { data, error: errorDoc } = await supabase
        .from('documentos')
        .select('id, numero')
        .eq('id', id)
        .single()
      if (errorDoc) throw errorDoc
      return data as { id: number; numero: string }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes'] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['documentos'] })
    },
  })
}
