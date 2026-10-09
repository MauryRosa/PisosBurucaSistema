/**
 * CapturaLineas.tsx
 * Captura de productos y cantidades para cualquier movimiento (RF-33).
 * Pisos: se escriben cajas + piezas. Accesorios: solo unidades.
 * Internamente todo se convierte a unidad base.
 */
import { useState } from 'react'
import type { Producto } from '@/modulos/catalogo/tipos'
import { aUnidadBase, formatearStock } from '@/lib/unidades'
import { Campo } from './Campo'
import { SelectorProducto } from './SelectorProducto'
import {
  claseBotonSecundario,
  claseBotonTabla,
  claseCelda,
  claseEncabezado,
  claseInput,
  claseTabla,
} from './estilos'

/** Una línea capturada: el producto y su cantidad en unidad base. */
export interface LineaCaptura {
  producto: Producto
  cantidad: number
}

interface Props {
  productos: Producto[] // catálogo para el buscador
  lineas: LineaCaptura[] // líneas actuales
  onCambiar: (lineas: LineaCaptura[]) => void // avisa cuando cambian las líneas
}

/**
 * CapturaLineas: buscador + cantidades + tabla de líneas agregadas.
 * Si se agrega un producto que ya está en la lista, se suman las cantidades.
 */
export function CapturaLineas({ productos, lineas, onCambiar }: Props) {
  const [producto, setProducto] = useState<Producto | null>(null) // producto elegido
  const [cajas, setCajas] = useState('') // texto del campo cajas
  const [piezas, setPiezas] = useState('') // texto del campo piezas/unidades
  const [error, setError] = useState<string | null>(null)

  const esPiso = producto?.tipo === 'piso'

  /**
   * agregar: valida la cantidad, la convierte a unidad base y la suma a la lista.
   */
  const agregar = () => {
    setError(null)
    if (!producto) {
      setError('Elija un producto')
      return
    }
    try {
      const cantidad = aUnidadBase(producto, {
        cajas: esPiso ? Number(cajas || 0) : 0,
        piezas: Number(piezas || 0),
      })
      if (cantidad <= 0) {
        setError('Escriba una cantidad mayor a cero')
        return
      }
      // Si el producto ya está en la lista, sumar; si no, agregar
      const existe = lineas.some((l) => l.producto.id === producto.id)
      const nuevas = existe
        ? lineas.map((l) =>
            l.producto.id === producto.id ? { ...l, cantidad: l.cantidad + cantidad } : l,
          )
        : [...lineas, { producto, cantidad }]
      onCambiar(nuevas)
      // Limpiar para el siguiente producto
      setProducto(null)
      setCajas('')
      setPiezas('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cantidad no válida')
    }
  }

  /** quitar: elimina una línea de la lista. */
  const quitar = (productoId: number) => {
    onCambiar(lineas.filter((l) => l.producto.id !== productoId))
  }

  return (
    <div className="space-y-3">
      {/* Fila de captura */}
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem_8rem_auto] sm:items-end">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Producto</span>
          <SelectorProducto
            productos={productos}
            seleccionado={producto}
            onSeleccionar={setProducto}
          />
        </label>

        {esPiso && (
          <Campo etiqueta="Cajas">
            <input
              type="number"
              min={0}
              value={cajas}
              onChange={(e) => setCajas(e.target.value)}
              className={claseInput}
            />
          </Campo>
        )}

        <Campo etiqueta={esPiso ? 'Piezas sueltas' : `Cantidad (${producto?.unidad ?? 'unidad'})`}>
          <input
            type="number"
            min={0}
            value={piezas}
            onChange={(e) => setPiezas(e.target.value)}
            className={claseInput}
          />
        </Campo>

        <button type="button" onClick={agregar} className={claseBotonSecundario}>
          Agregar
        </button>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {/* Líneas agregadas */}
      {lineas.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className={claseTabla}>
            <thead className={claseEncabezado}>
              <tr>
                <th className={claseCelda}>Producto</th>
                <th className={claseCelda}>Cantidad</th>
                <th className={claseCelda}></th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l) => (
                <tr key={l.producto.id} className="border-t border-slate-100">
                  <td className={claseCelda}>
                    <span className="font-mono text-xs">{l.producto.codigo}</span> ·{' '}
                    {l.producto.nombre}
                  </td>
                  <td className={claseCelda}>{formatearStock(l.producto, l.cantidad)}</td>
                  <td className={claseCelda}>
                    <button
                      type="button"
                      className={claseBotonTabla}
                      onClick={() => quitar(l.producto.id)}
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
