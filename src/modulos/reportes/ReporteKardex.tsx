/**
 * ReporteKardex.tsx
 * Kardex de un producto en una ubicación (RF-39): cada movimiento aprobado
 * con su entrada, salida y el saldo después del movimiento.
 * El saldo se calcula desde el primer movimiento (inventario inicial), así
 * que el saldo final debe coincidir con el físico de "Consulta de stock".
 */
import { useState } from 'react'
import { Campo } from '@/components/Campo'
import { SelectorProducto } from '@/components/SelectorProducto'
import {
  claseBoton,
  claseCelda,
  claseEncabezado,
  claseInput,
  claseTabla,
} from '@/components/estilos'
import { NOMBRE_TIPO_DOCUMENTO } from '@/lib/documentos'
import { exportarExcel } from '@/lib/excel'
import { formatearFechaHora, hoyLocal, inicioDeMes, inicioDelDia } from '@/lib/fechas'
import { mensajeError } from '@/lib/supabase'
import { formatearStock } from '@/lib/unidades'
import { useProductos, useUbicaciones } from '@/modulos/catalogo/api'
import type { Producto } from '@/modulos/catalogo/tipos'
import { useKardex } from './api'
import { calcularKardex } from './kardex'
import { FiltroFechas } from './FiltroFechas'

/**
 * ReporteKardex: elige producto, ubicación y fechas; calcula saldos y exporta.
 */
export function ReporteKardex() {
  const productos = useProductos()
  const ubicaciones = useUbicaciones()

  const [producto, setProducto] = useState<Producto | null>(null)
  const [ubicacionElegida, setUbicacionElegida] = useState<number | null>(null)
  const [desde, setDesde] = useState(inicioDeMes())
  const [hasta, setHasta] = useState(hoyLocal())

  const ubicacion = ubicacionElegida ?? ubicaciones.data?.find((u) => u.es_principal)?.id ?? null
  const kardex = useKardex(producto?.id ?? null, ubicacion, hasta)

  // Calcular entrada, salida y saldo acumulado de cada movimiento (ver kardex.ts)
  const todas = calcularKardex(kardex.data ?? [], ubicacion)

  // Saldo al iniciar el periodo y movimientos dentro del periodo
  const limite = inicioDelDia(desde)
  const anteriores = todas.filter((f) => f.fecha < limite)
  const saldoInicial = anteriores.at(-1)?.saldo ?? 0
  const filas = todas.filter((f) => f.fecha >= limite)

  /** texto: cantidad en cajas/piezas o unidades del producto elegido. */
  const texto = (cantidad: number) => (producto ? formatearStock(producto, cantidad) : '')

  /** exportar: descarga el kardex en Excel (incluye el saldo inicial). */
  const exportar = () => {
    if (!producto) return
    exportarExcel(`kardex-${producto.codigo}-${desde}-a-${hasta}`, 'Kardex', [
      {
        Fecha: desde,
        Documento: '',
        Tipo: 'Saldo inicial',
        Entrada: '',
        Salida: '',
        Saldo: texto(saldoInicial),
        'Saldo (unidad base)': saldoInicial,
      },
      ...filas.map((f) => ({
        Fecha: formatearFechaHora(f.fecha),
        Documento: f.numero,
        Tipo: NOMBRE_TIPO_DOCUMENTO[f.tipo],
        Entrada: f.entrada ? texto(f.entrada) : '',
        Salida: f.salida ? texto(f.salida) : '',
        Saldo: texto(f.saldo),
        'Saldo (unidad base)': f.saldo,
      })),
    ])
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <label className="block text-sm lg:col-span-2">
          <span className="font-medium text-slate-700">Producto</span>
          <SelectorProducto
            productos={productos.data ?? []}
            seleccionado={producto}
            onSeleccionar={setProducto}
          />
        </label>
        <Campo etiqueta="Ubicación">
          <select
            value={ubicacion ?? ''}
            onChange={(e) => setUbicacionElegida(Number(e.target.value))}
            className={claseInput}
          >
            {ubicaciones.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
      </div>

      <button
        type="button"
        onClick={exportar}
        disabled={!producto || kardex.isPending}
        className={claseBoton}
      >
        Exportar a Excel
      </button>

      {!producto && <p className="text-sm text-slate-500">Elija un producto para ver su kardex.</p>}
      {producto && kardex.isPending && <p className="text-slate-500">Cargando…</p>}
      {kardex.isError && <p className="text-red-700">{mensajeError(kardex.error)}</p>}

      {producto && kardex.isSuccess && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className={claseTabla}>
            <thead className={claseEncabezado}>
              <tr>
                <th className={claseCelda}>Fecha</th>
                <th className={claseCelda}>Documento</th>
                <th className={claseCelda}>Tipo</th>
                <th className={claseCelda}>Entrada</th>
                <th className={claseCelda}>Salida</th>
                <th className={claseCelda}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100 bg-slate-50 font-medium">
                <td className={claseCelda}>{desde}</td>
                <td className={claseCelda} colSpan={4}>
                  Saldo inicial del periodo
                </td>
                <td className={claseCelda}>{texto(saldoInicial)}</td>
              </tr>
              {filas.map((f) => (
                <tr key={f.linea_id} className="border-t border-slate-100">
                  <td className={`${claseCelda} whitespace-nowrap`}>
                    {formatearFechaHora(f.fecha)}
                  </td>
                  <td className={`${claseCelda} font-mono text-xs`}>{f.numero}</td>
                  <td className={claseCelda}>{NOMBRE_TIPO_DOCUMENTO[f.tipo]}</td>
                  <td className={`${claseCelda} text-green-700`}>
                    {f.entrada ? texto(f.entrada) : ''}
                  </td>
                  <td className={`${claseCelda} text-red-700`}>
                    {f.salida ? texto(f.salida) : ''}
                  </td>
                  <td className={`${claseCelda} font-medium`}>{texto(f.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
