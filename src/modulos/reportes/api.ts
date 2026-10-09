/**
 * api.ts (módulo Reportes)
 * Consultas a la vista v_movimientos para cada reporte.
 * Nota: Supabase devuelve como máximo 1000 filas por consulta.
 */
import { useQuery } from '@tanstack/react-query'
import type { TipoDocumento } from '@/lib/documentos'
import { finDelDia, inicioDelDia } from '@/lib/fechas'
import { supabase } from '@/lib/supabase'
import type { FilaMovimiento } from './tipos'

/**
 * useMovimientosPeriodo: movimientos entre dos fechas, de ciertos tipos
 * (o de todos si "tipos" viene vacío), del más antiguo al más reciente.
 */
export function useMovimientosPeriodo(desde: string, hasta: string, tipos: TipoDocumento[]) {
  return useQuery({
    queryKey: ['reporte', 'movimientos', desde, hasta, tipos],
    enabled: Boolean(desde && hasta),
    queryFn: async (): Promise<FilaMovimiento[]> => {
      let consulta = supabase
        .from('v_movimientos')
        .select('*')
        .gte('fecha', inicioDelDia(desde))
        .lte('fecha', finDelDia(hasta))
        .order('fecha')
        .order('linea_id')
      if (tipos.length > 0) consulta = consulta.in('tipo', tipos)

      const { data, error } = await consulta
      if (error) throw error
      return data as FilaMovimiento[]
    },
  })
}

/**
 * useKardex: todos los movimientos APROBADOS de un producto que tocan una
 * ubicación, desde el inicio hasta la fecha "hasta" (para calcular el saldo).
 */
export function useKardex(productoId: number | null, ubicacionId: number | null, hasta: string) {
  return useQuery({
    queryKey: ['reporte', 'kardex', productoId, ubicacionId, hasta],
    enabled: Boolean(productoId && ubicacionId && hasta),
    queryFn: async (): Promise<FilaMovimiento[]> => {
      const { data, error } = await supabase
        .from('v_movimientos')
        .select('*')
        .eq('producto_id', productoId!)
        .eq('estado', 'aprobado')
        .or(`ubicacion_origen_id.eq.${ubicacionId},ubicacion_destino_id.eq.${ubicacionId}`)
        .lte('fecha', finDelDia(hasta))
        .order('fecha')
        .order('linea_id')
      if (error) throw error
      return data as FilaMovimiento[]
    },
  })
}
