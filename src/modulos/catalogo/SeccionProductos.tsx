/**
 * SeccionProductos.tsx
 * Lista de productos con búsqueda, filtro de inactivos y opciones para
 * crear, editar y activar/desactivar (RF-01 a RF-05).
 */
import { useMemo, useState } from 'react'
import {
  claseBoton,
  claseBotonTabla,
  claseCelda,
  claseEncabezado,
  claseInput,
  claseTabla,
} from '@/components/estilos'
import { mensajeError } from '@/lib/supabase'
import { useCambiarActivo, useProductos, useProveedores } from './api'
import { FormularioProducto } from './FormularioProducto'
import type { Producto } from './tipos'

/**
 * descripcionEmpaque: texto corto de cómo se maneja el producto.
 * Ej. "2 piezas/caja" para pisos, "bolsa" para accesorios.
 */
function descripcionEmpaque(p: Producto): string {
  return p.tipo === 'piso' ? `${p.piezas_por_caja} piezas/caja` : p.unidad
}

/**
 * SeccionProductos: tabla de productos + formulario de alta/edición.
 */
export function SeccionProductos() {
  const productos = useProductos()
  const proveedores = useProveedores()
  const cambiarActivo = useCambiarActivo('productos')
  const [editando, setEditando] = useState<Producto | 'nuevo' | null>(null)
  const [busqueda, setBusqueda] = useState('') // texto del buscador
  const [verInactivos, setVerInactivos] = useState(false) // mostrar desactivados

  // Productos filtrados por búsqueda (código, nombre o categoría) y estado
  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return (productos.data ?? []).filter(
      (p) =>
        (verInactivos || p.activo) &&
        (!texto ||
          p.codigo.toLowerCase().includes(texto) ||
          p.nombre.toLowerCase().includes(texto) ||
          p.categoria.toLowerCase().includes(texto)),
    )
  }, [productos.data, busqueda, verInactivos])

  if (productos.isPending) return <p className="text-slate-500">Cargando…</p>
  if (productos.isError) return <p className="text-red-700">{mensajeError(productos.error)}</p>

  return (
    <div className="space-y-4">
      {editando ? (
        <FormularioProducto
          key={editando === 'nuevo' ? 'nuevo' : editando.id}
          producto={editando === 'nuevo' ? null : editando}
          proveedores={proveedores.data ?? []}
          alTerminar={() => setEditando(null)}
        />
      ) : (
        <button type="button" onClick={() => setEditando('nuevo')} className={claseBoton}>
          Nuevo producto
        </button>
      )}

      {/* Buscador y filtro */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder="Buscar por código, nombre o categoría"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className={`${claseInput} sm:max-w-md`}
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={verInactivos}
            onChange={(e) => setVerInactivos(e.target.checked)}
          />
          Mostrar inactivos
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className={claseTabla}>
          <thead className={claseEncabezado}>
            <tr>
              <th className={claseCelda}>Código</th>
              <th className={claseCelda}>Nombre</th>
              <th className={claseCelda}>Tipo</th>
              <th className={claseCelda}>Categoría</th>
              <th className={claseCelda}>Empaque</th>
              <th className={claseCelda}>Stock mín.</th>
              <th className={claseCelda}>Proveedor</th>
              <th className={claseCelda}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => (
              <tr
                key={p.id}
                className={`border-t border-slate-100 ${p.activo ? '' : 'text-slate-400'}`}
              >
                <td className={`${claseCelda} font-mono text-xs`}>{p.codigo}</td>
                <td className={claseCelda}>
                  {p.nombre}
                  {p.medida && <span className="text-slate-500"> · {p.medida}</span>}
                </td>
                <td className={claseCelda}>{p.tipo === 'piso' ? 'Piso' : 'Accesorio'}</td>
                <td className={claseCelda}>{p.categoria}</td>
                <td className={claseCelda}>{descripcionEmpaque(p)}</td>
                <td className={claseCelda}>{p.stock_minimo}</td>
                <td className={claseCelda}>{p.proveedores?.nombre ?? '—'}</td>
                <td className={`${claseCelda} space-x-3 whitespace-nowrap`}>
                  <button type="button" className={claseBotonTabla} onClick={() => setEditando(p)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className={claseBotonTabla}
                    onClick={() => cambiarActivo.mutate({ id: p.id, activo: !p.activo })}
                  >
                    {p.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                  No hay productos que coincidan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
