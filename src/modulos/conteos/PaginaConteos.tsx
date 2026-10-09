/**
 * PaginaConteos.tsx
 * Conteos físicos (RF-37): iniciar un conteo nuevo, ver la lista de conteos
 * y abrir uno para capturar lo contado.
 */
import { useState } from 'react'
import { Campo } from '@/components/Campo'
import {
  claseBoton,
  claseBotonTabla,
  claseCelda,
  claseEncabezado,
  claseInput,
  claseTabla,
} from '@/components/estilos'
import { mensajeError } from '@/lib/supabase'
import { useProductos, useUbicaciones } from '@/modulos/catalogo/api'
import { useConteos, useIniciarConteo } from './api'
import { DetalleConteo } from './DetalleConteo'

/**
 * PaginaConteos: formulario de nuevo conteo + lista, o el detalle del conteo elegido.
 */
export function PaginaConteos() {
  const conteos = useConteos()
  const ubicaciones = useUbicaciones()
  const productos = useProductos()
  const iniciar = useIniciarConteo()

  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null) // conteo abierto en pantalla
  const [ubicacionElegida, setUbicacionElegida] = useState<number | null>(null)
  const [categoria, setCategoria] = useState('') // '' = todos los productos
  const [notas, setNotas] = useState('')
  const [error, setError] = useState<string | null>(null)

  const ubicacion = ubicacionElegida ?? ubicaciones.data?.find((u) => u.es_principal)?.id ?? null

  // Categorías existentes (sin repetir), sacadas del catálogo
  const categorias = [...new Set((productos.data ?? []).map((p) => p.categoria))].sort()

  /** iniciarConteo: crea el conteo y lo abre en pantalla. */
  const iniciarConteo = async () => {
    setError(null)
    if (!ubicacion) return setError('Elija la ubicación')
    try {
      const id = await iniciar.mutateAsync({
        ubicacion_id: ubicacion,
        categoria: categoria || null,
        notas: notas.trim() || null,
      })
      setNotas('')
      setSeleccionadoId(id)
    } catch (e) {
      setError(mensajeError(e))
    }
  }

  // Si hay un conteo elegido, mostrar su detalle
  const seleccionado = conteos.data?.find((c) => c.id === seleccionadoId)
  if (seleccionado) {
    return <DetalleConteo conteo={seleccionado} onVolver={() => setSeleccionadoId(null)} />
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Conteos físicos</h1>
        <p className="text-sm text-slate-500">
          Compare lo que hay físicamente contra el sistema. Las diferencias generan un ajuste que
          gerencia aprueba.
        </p>
      </div>

      {/* Nuevo conteo */}
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Nuevo conteo</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo etiqueta="Ubicación">
            <select
              value={ubicacion ?? ''}
              onChange={(e) => setUbicacionElegida(Number(e.target.value))}
              className={claseInput}
            >
              {ubicaciones.data
                ?.filter((u) => u.activa)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
            </select>
          </Campo>
          <Campo etiqueta="Categoría">
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className={claseInput}
            >
              <option value="">Todos los productos</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Notas (opcional)">
            <input
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className={claseInput}
            />
          </Campo>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button
          type="button"
          onClick={iniciarConteo}
          disabled={iniciar.isPending}
          className={claseBoton}
        >
          {iniciar.isPending ? 'Iniciando…' : 'Iniciar conteo'}
        </button>
      </div>

      {/* Lista de conteos */}
      <section className="space-y-2">
        <h2 className="font-semibold">Conteos</h2>
        {conteos.isPending && <p className="text-slate-500">Cargando…</p>}
        {conteos.isError && <p className="text-red-700">{mensajeError(conteos.error)}</p>}
        {conteos.isSuccess && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className={claseTabla}>
              <thead className={claseEncabezado}>
                <tr>
                  <th className={claseCelda}>#</th>
                  <th className={claseCelda}>Fecha</th>
                  <th className={claseCelda}>Ubicación</th>
                  <th className={claseCelda}>Categoría</th>
                  <th className={claseCelda}>Inició</th>
                  <th className={claseCelda}>Estado</th>
                  <th className={claseCelda}>Ajuste</th>
                  <th className={claseCelda}></th>
                </tr>
              </thead>
              <tbody>
                {conteos.data.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className={claseCelda}>{c.id}</td>
                    <td className={`${claseCelda} whitespace-nowrap`}>
                      {new Date(c.creado_en).toLocaleString('es-SV')}
                    </td>
                    <td className={claseCelda}>{c.ubicaciones.nombre}</td>
                    <td className={claseCelda}>{c.categoria ?? 'Todos'}</td>
                    <td className={claseCelda}>{c.creador?.nombre ?? '—'}</td>
                    <td className={`${claseCelda} capitalize`}>{c.estado}</td>
                    <td className={claseCelda}>
                      {c.ajuste ? `${c.ajuste.numero} (${c.ajuste.estado})` : '—'}
                    </td>
                    <td className={claseCelda}>
                      <button
                        type="button"
                        className={claseBotonTabla}
                        onClick={() => setSeleccionadoId(c.id)}
                      >
                        {c.estado === 'abierto' ? 'Continuar' : 'Ver'}
                      </button>
                    </td>
                  </tr>
                ))}
                {conteos.data.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                      Todavía no hay conteos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}
