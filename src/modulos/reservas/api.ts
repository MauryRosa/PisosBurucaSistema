/**
 * api.ts (módulo Reservas)
 * Lectura de reservas y vendedoras, y llamadas a las funciones
 * crear_reserva y cancelar_reserva de la base de datos (RF-26 a RF-28).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TipoComprobante } from '@/lib/documentos'
import type { TipoProducto } from '@/lib/unidades'

/** Estados posibles de una reserva. */
export type EstadoReserva = 'activa' | 'consumida' | 'cancelada'

/** Reserva con producto, ubicación y vendedora. */
export interface Reserva {
  id: number
  cantidad: number // unidad base
  estado: EstadoReserva
  tipo_comprobante: TipoComprobante | null
  numero_comprobante: string | null
  notas: string | null
  motivo_cancelacion: string | null
  creado_en: string
  productos: {
    codigo: string
    nombre: string
    tipo: TipoProducto
    unidad: string
    piezas_por_caja: number | null
  }
  ubicaciones: { nombre: string }
  vendedora: { nombre: string } | null
}

/** Vendedora (perfil con rol vendedora). */
export interface Vendedora {
  id: string
  nombre: string
}

/**
 * useVendedoras: lista las vendedoras activas (para elegir quién pide la reserva).
 */
export function useVendedoras() {
  return useQuery({
    queryKey: ['vendedoras'],
    queryFn: async (): Promise<Vendedora[]> => {
      const { data, error } = await supabase
        .from('perfiles')
        .select('id, nombre')
        .eq('rol', 'vendedora')
        .eq('activo', true)
        .order('nombre')
      if (error) throw error
      return data as Vendedora[]
    },
  })
}

/**
 * useReservas: lista reservas, las más recientes primero.
 * @param soloActivas true = solo las activas; false = las últimas 100 de cualquier estado.
 */
export function useReservas(soloActivas: boolean) {
  return useQuery({
    queryKey: ['reservas', soloActivas],
    queryFn: async (): Promise<Reserva[]> => {
      let consulta = supabase
        .from('reservas')
        .select(
          `id, cantidad, estado, tipo_comprobante, numero_comprobante, notas,
           motivo_cancelacion, creado_en,
           productos(codigo, nombre, tipo, unidad, piezas_por_caja),
           ubicaciones(nombre),
           vendedora:perfiles!reservas_vendedora_id_fkey(nombre)`,
        )
        .order('creado_en', { ascending: false })
        .limit(100)
      if (soloActivas) consulta = consulta.eq('estado', 'activa')

      const { data, error } = await consulta
      if (error) throw error
      return data as unknown as Reserva[]
    },
  })
}

/** Datos para crear una reserva. */
export interface NuevaReserva {
  producto_id: number
  ubicacion_id: number
  cantidad: number // unidad base
  vendedora_id: string
  tipo_comprobante: TipoComprobante | null
  numero_comprobante: string | null
  notas: string | null
}

/**
 * refrescarTodo: vuelve a consultar reservas y stock (el disponible cambia).
 */
function useRefrescar() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['reservas'] })
    queryClient.invalidateQueries({ queryKey: ['stock'] })
  }
}

/**
 * useCrearReserva: llama a crear_reserva. La base de datos valida
 * que haya disponible suficiente.
 */
export function useCrearReserva() {
  const refrescar = useRefrescar()
  return useMutation({
    mutationFn: async (r: NuevaReserva) => {
      const { error } = await supabase.rpc('crear_reserva', {
        p_producto: r.producto_id,
        p_ubicacion: r.ubicacion_id,
        p_cantidad: r.cantidad,
        p_vendedora: r.vendedora_id,
        p_tipo_comprobante: r.tipo_comprobante,
        p_numero_comprobante: r.numero_comprobante,
        p_notas: r.notas,
      })
      if (error) throw error
    },
    onSuccess: refrescar,
  })
}

/**
 * useCancelarReserva: libera una reserva activa indicando el motivo.
 */
export function useCancelarReserva() {
  const refrescar = useRefrescar()
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: number; motivo: string }) => {
      const { error } = await supabase.rpc('cancelar_reserva', {
        p_reserva: id,
        p_motivo: motivo,
      })
      if (error) throw error
    },
    onSuccess: refrescar,
  })
}
