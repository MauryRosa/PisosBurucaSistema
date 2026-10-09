/**
 * api.ts (módulo Stock)
 * Consulta de stock y escucha de cambios en tiempo real (RF-36, RNF-04).
 */
import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { FilaStock } from './tipos'

/**
 * useStock: lee la vista v_stock (todos los productos activos en todas las ubicaciones).
 */
export function useStock() {
  return useQuery({
    queryKey: ['stock'],
    queryFn: async (): Promise<FilaStock[]> => {
      const { data, error } = await supabase
        .from('v_stock')
        .select('*')
        .order('nombre')
        .order('ubicacion_id')
      if (error) throw error
      return data as FilaStock[]
    },
  })
}

/**
 * useStockEnTiempoReal: escucha cambios en existencias y reservas.
 * Cuando bodega registra un movimiento, vuelve a consultar el stock
 * automáticamente, sin que el usuario recargue la página.
 */
export function useStockEnTiempoReal() {
  const queryClient = useQueryClient()

  useEffect(() => {
    /** refrescar: marca el stock como desactualizado para que se vuelva a leer. */
    const refrescar = () => queryClient.invalidateQueries({ queryKey: ['stock'] })

    // Canal de Supabase Realtime con dos suscripciones
    const canal = supabase
      .channel('cambios-stock')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'existencias' }, refrescar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, refrescar)
      .subscribe()

    // Al salir de la pantalla, cerrar el canal
    return () => {
      void supabase.removeChannel(canal)
    }
  }, [queryClient])
}
