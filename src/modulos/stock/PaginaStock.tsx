/**
 * PaginaStock.tsx
 * Consulta de stock en tiempo real (RF-36). La usan los tres roles.
 * Muestra por producto y ubicación: disponible, reservado y físico,
 * en "Cajas · Piezas" para pisos y en su unidad para accesorios.
 */
import { useMemo, useState } from 'react'
import { claseCelda, claseEncabezado, claseInput, claseTabla } from '@/components/estilos'
import { mensajeError } from '@/lib/supabase'
import { formatearStock } from '@/lib/unidades'
import { useStock, useStockEnTiempoReal } from './api'

/**
 * PaginaStock: buscador, filtros y tabla de stock.
 */
export function PaginaStock() {
  const stock = useStock()
  useStockEnTiempoReal() // refresca solo cuando bodega registra movimientos

  const [busqueda, setBusqueda] = useState('') // texto del buscador
  const [ubicacion, setUbicacion] = useState<number | 'todas'>('todas') // filtro de ubicación
  const [soloConExistencia, setSoloConExistencia] = useState(false) // ocultar productos en 0

  // Lista de ubicaciones sacada de los mismos datos (para el selector)
  const ubicaciones = useMemo(() => {
    const mapa = new Map<number, string>()
    stock.data?.forEach((f) => mapa.set(f.ubicacion_id, f.ubicacion))
    return [...mapa.entries()]
  }, [stock.data])

  // Filas que cumplen los filtros
  const filas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return (stock.data ?? []).filter(
      (f) =>
        (ubicacion === 'todas' || f.ubicacion_id === ubicacion) &&
        (!soloConExistencia || f.fisico > 0) &&
        (!texto ||
          f.codigo.toLowerCase().includes(texto) ||
          f.nombre.toLowerCase().includes(texto) ||
          f.categoria.toLowerCase().includes(texto)),
    )
  }, [stock.data, busqueda, ubicacion, soloConExistencia])

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Consulta de stock</h1>
        <p className="text-sm text-slate-500">
          Disponible = físico menos reservado. Se actualiza solo cuando bodega registra un
          movimiento.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder="Buscar por código, nombre o categoría"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className={`${claseInput} sm:max-w-md`}
        />
        <select
          value={ubicacion}
          onChange={(e) =>
            setUbicacion(e.target.value === 'todas' ? 'todas' : Number(e.target.value))
          }
          className={`${claseInput} sm:w-auto`}
        >
          <option value="todas">Todas las ubicaciones</option>
          {ubicaciones.map(([id, nombre]) => (
            <option key={id} value={id}>
              {nombre}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={soloConExistencia}
            onChange={(e) => setSoloConExistencia(e.target.checked)}
          />
          Solo con existencia
        </label>
      </div>

      {stock.isPending && <p className="text-slate-500">Cargando…</p>}
      {stock.isError && <p className="text-red-700">{mensajeError(stock.error)}</p>}

      {stock.isSuccess && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className={claseTabla}>
            <thead className={claseEncabezado}>
              <tr>
                <th className={claseCelda}>Código</th>
                <th className={claseCelda}>Producto</th>
                <th className={claseCelda}>Ubicación</th>
                <th className={claseCelda}>Disponible</th>
                <th className={claseCelda}>Reservado</th>
                <th className={claseCelda}>Físico</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                // Alerta si el disponible está por debajo del mínimo (RF-04)
                const bajoMinimo = f.stock_minimo > 0 && f.disponible < f.stock_minimo
                return (
                  <tr
                    key={`${f.producto_id}-${f.ubicacion_id}`}
                    className="border-t border-slate-100"
                  >
                    <td className={`${claseCelda} font-mono text-xs`}>{f.codigo}</td>
                    <td className={claseCelda}>
                      {f.nombre}
                      {f.medida && <span className="text-slate-500"> · {f.medida}</span>}
                    </td>
                    <td className={`${claseCelda} text-slate-600`}>{f.ubicacion}</td>
                    <td
                      className={`${claseCelda} font-medium ${bajoMinimo ? 'text-amber-700' : ''}`}
                    >
                      {formatearStock(f, f.disponible)}
                      {bajoMinimo && <span className="ml-2 text-xs">bajo mínimo</span>}
                    </td>
                    <td className={`${claseCelda} text-slate-600`}>
                      {formatearStock(f, f.reservado)}
                    </td>
                    <td className={`${claseCelda} text-slate-600`}>
                      {formatearStock(f, f.fisico)}
                    </td>
                  </tr>
                )
              })}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    No hay productos que coincidan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
