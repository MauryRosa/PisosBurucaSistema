// =====================================================================
// Datos del dashboard de Inicio
// =====================================================================

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { calcularBajoMinimo, type FilaStockMinimo } from './bajoMinimo'

/**
 * Trae de v_stock los productos que tienen stock mínimo definido y
 * devuelve los que están por debajo (sumando todas las ubicaciones).
 * Usa la clave 'stock' para refrescarse junto con la consulta de stock.
 * Además se vuelve a consultar cada minuto mientras Inicio esté abierto.
 */
export function useBajoMinimo() {
  return useQuery({
    queryKey: ['stock', 'bajo-minimo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_stock')
        .select('producto_id, codigo, nombre, piezas_por_caja, stock_minimo, disponible')
        .gt('stock_minimo', 0)
      if (error) throw error
      return calcularBajoMinimo((data ?? []) as FilaStockMinimo[])
    },
    refetchInterval: 60_000,
  })
}
