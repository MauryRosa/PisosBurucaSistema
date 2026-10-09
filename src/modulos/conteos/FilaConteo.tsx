/**
 * FilaConteo.tsx
 * Una fila del conteo: producto, lo que dice el sistema, captura de lo
 * contado (cajas + piezas, o unidades) y la diferencia.
 */
import { useState } from 'react'
import { claseBotonTabla, claseCelda, claseInput } from '@/components/estilos'
import { mensajeError } from '@/lib/supabase'
import { aUnidadBase, desglosar, formatearStock } from '@/lib/unidades'
import { useGuardarContado } from './api'
import type { LineaConteo } from './tipos'

interface Props {
  linea: LineaConteo
  conteoId: number
  editable: boolean // false si el conteo ya está cerrado o cancelado
}

/**
 * textoDiferencia: diferencia con signo y en la unidad del producto.
 * Ej. "+ Cajas 0 · Piezas 1" (sobra) o "− 3 bolsa" (falta).
 */
function textoDiferencia(linea: LineaConteo): string {
  const dif = linea.diferencia ?? 0
  if (dif === 0) return 'Sin diferencia'
  return `${dif > 0 ? '+' : '−'} ${formatearStock(linea.productos, Math.abs(dif))}`
}

/**
 * FilaConteo: captura y guarda lo contado de un producto.
 */
export function FilaConteo({ linea, conteoId, editable }: Props) {
  const guardar = useGuardarContado(conteoId)
  const p = linea.productos
  const esPiso = p.tipo === 'piso'

  // Valores iniciales: lo ya contado (si existe), desglosado en cajas y piezas sueltas
  const inicial = linea.cantidad_contada === null ? null : desglosar(p, linea.cantidad_contada)
  const [cajas, setCajas] = useState(inicial && esPiso ? String(inicial.cajas) : '')
  const [piezas, setPiezas] = useState(
    inicial ? String(esPiso ? inicial.piezasSueltas : inicial.piezasTotales) : '',
  )
  const [error, setError] = useState<string | null>(null)

  /** guardarFila: convierte lo escrito a unidad base y lo guarda. */
  const guardarFila = async () => {
    setError(null)
    try {
      const cantidad = aUnidadBase(p, {
        cajas: esPiso ? Number(cajas || 0) : 0,
        piezas: Number(piezas || 0),
      })
      await guardar.mutateAsync({ detalleId: linea.id, cantidad })
    } catch (e) {
      setError(e instanceof Error ? e.message : mensajeError(e))
    }
  }

  const contado = linea.cantidad_contada !== null
  const dif = linea.diferencia ?? 0

  return (
    <tr className={`border-t border-slate-100 align-top ${contado ? '' : 'bg-amber-50/40'}`}>
      <td className={claseCelda}>
        <span className="font-mono text-xs">{p.codigo}</span> · {p.nombre}
      </td>
      <td className={claseCelda}>{formatearStock(p, linea.cantidad_sistema)}</td>
      <td className={claseCelda}>
        {editable ? (
          <div className="flex flex-wrap items-center gap-2">
            {esPiso && (
              <input
                type="number"
                min={0}
                placeholder="Cajas"
                value={cajas}
                onChange={(e) => setCajas(e.target.value)}
                className={`${claseInput} mt-0 w-24`}
              />
            )}
            <input
              type="number"
              min={0}
              placeholder={esPiso ? 'Piezas' : p.unidad}
              value={piezas}
              onChange={(e) => setPiezas(e.target.value)}
              className={`${claseInput} mt-0 w-24`}
            />
            <button
              type="button"
              className={claseBotonTabla}
              onClick={guardarFila}
              disabled={guardar.isPending}
            >
              {guardar.isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        ) : contado ? (
          formatearStock(p, linea.cantidad_contada ?? 0)
        ) : (
          '—'
        )}
        {error && <span className="block text-xs text-red-700">{error}</span>}
      </td>
      <td
        className={`${claseCelda} ${!contado ? 'text-slate-400' : dif === 0 ? 'text-green-700' : 'font-medium text-amber-700'}`}
      >
        {contado ? textoDiferencia(linea) : 'Pendiente'}
      </td>
    </tr>
  )
}
