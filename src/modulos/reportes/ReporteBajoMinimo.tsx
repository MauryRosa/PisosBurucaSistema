/**
 * ReporteBajoMinimo.tsx
 * Productos cuyo disponible total (todas las ubicaciones) está por debajo
 * de su stock mínimo (RF-04, RF-39). Sirve para planificar pedidos.
 */
import { claseBoton, claseCelda, claseEncabezado, claseTabla } from '@/components/estilos'
import { exportarExcel } from '@/lib/excel'
import { hoyLocal } from '@/lib/fechas'
import { mensajeError } from '@/lib/supabase'
import { formatearStock } from '@/lib/unidades'
import { useStock } from '@/modulos/stock/api'
import type { FilaStock } from '@/modulos/stock/tipos'

/** Producto con su disponible sumado en todas las ubicaciones. */
interface ProductoBajo {
  fila: FilaStock // datos del producto (de cualquiera de sus filas)
  disponible: number
  faltante: number // cuánto falta para llegar al mínimo
}

/**
 * ReporteBajoMinimo: suma el disponible por producto y lista los que están bajo el mínimo.
 */
export function ReporteBajoMinimo() {
  const stock = useStock()

  // Sumar el disponible de cada producto en todas las ubicaciones
  const porProducto = new Map<number, ProductoBajo>()
  for (const f of stock.data ?? []) {
    const actual = porProducto.get(f.producto_id)
    porProducto.set(f.producto_id, {
      fila: f,
      disponible: (actual?.disponible ?? 0) + f.disponible,
      faltante: 0,
    })
  }
  const bajos = [...porProducto.values()]
    .filter((p) => p.fila.stock_minimo > 0 && p.disponible < p.fila.stock_minimo)
    .map((p) => ({ ...p, faltante: p.fila.stock_minimo - p.disponible }))
    .sort((a, b) => a.fila.nombre.localeCompare(b.fila.nombre))

  /** exportar: descarga la lista en Excel. */
  const exportar = () =>
    exportarExcel(
      `bajo-minimo-${hoyLocal()}`,
      'Bajo mínimo',
      bajos.map((p) => ({
        Código: p.fila.codigo,
        Producto: p.fila.nombre,
        Categoría: p.fila.categoria,
        Disponible: formatearStock(p.fila, p.disponible),
        'Stock mínimo': formatearStock(p.fila, p.fila.stock_minimo),
        Faltante: formatearStock(p.fila, p.faltante),
        'Faltante (unidad base)': p.faltante,
        Unidad: p.fila.unidad,
      })),
    )

  if (stock.isPending) return <p className="text-slate-500">Cargando…</p>
  if (stock.isError) return <p className="text-red-700">{mensajeError(stock.error)}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          {bajos.length} producto(s) por debajo de su stock mínimo.
        </p>
        <button
          type="button"
          onClick={exportar}
          disabled={bajos.length === 0}
          className={claseBoton}
        >
          Exportar a Excel
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className={claseTabla}>
          <thead className={claseEncabezado}>
            <tr>
              <th className={claseCelda}>Código</th>
              <th className={claseCelda}>Producto</th>
              <th className={claseCelda}>Disponible</th>
              <th className={claseCelda}>Mínimo</th>
              <th className={claseCelda}>Faltante</th>
            </tr>
          </thead>
          <tbody>
            {bajos.map((p) => (
              <tr key={p.fila.producto_id} className="border-t border-slate-100">
                <td className={`${claseCelda} font-mono text-xs`}>{p.fila.codigo}</td>
                <td className={claseCelda}>{p.fila.nombre}</td>
                <td className={`${claseCelda} text-amber-700`}>
                  {formatearStock(p.fila, p.disponible)}
                </td>
                <td className={claseCelda}>{formatearStock(p.fila, p.fila.stock_minimo)}</td>
                <td className={`${claseCelda} font-medium`}>
                  {formatearStock(p.fila, p.faltante)}
                </td>
              </tr>
            ))}
            {bajos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  Ningún producto está por debajo de su mínimo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
