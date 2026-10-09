/**
 * SelectorProducto.tsx
 * Buscador de productos: el usuario escribe parte del código o nombre
 * y elige de una lista corta de coincidencias (máximo 8).
 */
import { useMemo, useState } from 'react'
import type { Producto } from '@/modulos/catalogo/tipos'
import { claseInput } from './estilos'

interface Props {
  productos: Producto[] // catálogo completo
  seleccionado: Producto | null // producto elegido (null = ninguno)
  onSeleccionar: (producto: Producto | null) => void // avisa al elegir o quitar
}

/**
 * empaque: descripción corta de cómo se maneja el producto.
 */
function empaque(p: Producto): string {
  return p.tipo === 'piso' ? `${p.piezas_por_caja} piezas/caja` : `por ${p.unidad}`
}

/**
 * SelectorProducto: muestra el buscador o, si ya hay uno elegido, el producto con un botón "Cambiar".
 */
export function SelectorProducto({ productos, seleccionado, onSeleccionar }: Props) {
  const [texto, setTexto] = useState('') // lo que escribe el usuario

  // Productos activos que coinciden con el texto
  const coincidencias = useMemo(() => {
    const t = texto.trim().toLowerCase()
    if (!t) return []
    return productos
      .filter(
        (p) =>
          p.activo && (p.codigo.toLowerCase().includes(t) || p.nombre.toLowerCase().includes(t)),
      )
      .slice(0, 8)
  }, [productos, texto])

  // Ya hay un producto elegido
  if (seleccionado) {
    return (
      <div className="mt-1 flex items-center justify-between gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
        <span>
          <span className="font-mono text-xs">{seleccionado.codigo}</span> · {seleccionado.nombre}{' '}
          <span className="text-slate-500">({empaque(seleccionado)})</span>
        </span>
        <button
          type="button"
          className="text-slate-600 underline"
          onClick={() => onSeleccionar(null)}
        >
          Cambiar
        </button>
      </div>
    )
  }

  // Buscador con lista de coincidencias
  return (
    <div className="relative">
      <input
        type="search"
        placeholder="Escriba código o nombre…"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className={claseInput}
      />
      {coincidencias.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          {coincidencias.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                onClick={() => {
                  onSeleccionar(p)
                  setTexto('')
                }}
              >
                <span className="font-mono text-xs">{p.codigo}</span> · {p.nombre}{' '}
                <span className="text-slate-500">({empaque(p)})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
