/**
 * PaginaPedidos.tsx
 * Órdenes de pedido (RF-09 a RF-11):
 *  - Administrador y vendedoras: crean órdenes y cancelan las pendientes.
 *  - Jefe de bodega y administrador: reciben la mercadería de cada orden.
 */
import { useState } from 'react'
import { useSesion } from '@/auth/contexto'
import {
  claseBotonTabla,
  claseCelda,
  claseEncabezado,
  claseInput,
  claseTabla,
} from '@/components/estilos'
import { formatearFechaHora } from '@/lib/fechas'
import { mensajeError } from '@/lib/supabase'
import { formatearStock } from '@/lib/unidades'
import { useCancelarOrden, useOrdenes } from './api'
import { FormularioOrden } from './FormularioOrden'
import { RecepcionOrden } from './RecepcionOrden'
import { COLOR_ESTADO_ORDEN, NOMBRE_ESTADO_ORDEN, type OrdenPedido } from './tipos'

/**
 * PaginaPedidos: formulario (según rol), recepción en curso y lista de órdenes.
 */
export function PaginaPedidos() {
  const { perfil } = useSesion()
  const ordenes = useOrdenes()
  const cancelar = useCancelarOrden()

  const puedeCrear = perfil?.rol === 'administrador' || perfil?.rol === 'vendedora'
  const puedeRecibir = perfil?.rol === 'administrador' || perfil?.rol === 'jefe_bodega'

  const [recibiendoId, setRecibiendoId] = useState<number | null>(null) // orden en recepción
  const [cancelandoId, setCancelandoId] = useState<number | null>(null) // orden por cancelar
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recibiendo = ordenes.data?.find((o) => o.id === recibiendoId)

  /** puedeCancelar: solo pendientes, por el administrador o quien la creó. */
  const puedeCancelar = (o: OrdenPedido) =>
    o.estado === 'pendiente' &&
    (perfil?.rol === 'administrador' || (puedeCrear && o.creado_por === perfil?.id))

  /** confirmarCancelacion: cancela la orden elegida con el motivo escrito. */
  const confirmarCancelacion = async () => {
    if (!cancelandoId) return
    setError(null)
    if (!motivo.trim()) return setError('Escriba el motivo de la cancelación')
    try {
      await cancelar.mutateAsync({ id: cancelandoId, motivo: motivo.trim() })
      setCancelandoId(null)
      setMotivo('')
    } catch (e) {
      setError(mensajeError(e))
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Órdenes de pedido</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pedidos a proveedor y su recepción en bodega, comparando lo recibido contra lo pedido.
        </p>
      </div>

      {/* Recepción en curso (bodega) o formulario de nueva orden */}
      {recibiendo ? (
        <RecepcionOrden
          key={recibiendo.id}
          orden={recibiendo}
          onCerrar={() => setRecibiendoId(null)}
        />
      ) : (
        puedeCrear && <FormularioOrden />
      )}

      {/* Lista de órdenes */}
      <section className="space-y-2">
        <h2 className="font-semibold">Órdenes</h2>
        {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
        {ordenes.isPending && <p className="text-slate-500 dark:text-slate-400">Cargando…</p>}
        {ordenes.isError && (
          <p className="text-red-700 dark:text-red-400">{mensajeError(ordenes.error)}</p>
        )}

        {ordenes.isSuccess && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className={claseTabla}>
              <thead className={claseEncabezado}>
                <tr>
                  <th className={claseCelda}>Número</th>
                  <th className={claseCelda}>Fecha</th>
                  <th className={claseCelda}>Proveedor</th>
                  <th className={claseCelda}>Productos (recibido / pedido)</th>
                  <th className={claseCelda}>Creó</th>
                  <th className={claseCelda}>Estado</th>
                  <th className={claseCelda}></th>
                </tr>
              </thead>
              <tbody>
                {ordenes.data.map((o) => (
                  <tr
                    key={o.id}
                    className="border-t border-slate-100 dark:border-slate-800 align-top"
                  >
                    <td className={`${claseCelda} font-mono text-xs whitespace-nowrap`}>
                      {o.numero}
                    </td>
                    <td className={`${claseCelda} whitespace-nowrap`}>
                      {formatearFechaHora(o.creado_en)}
                    </td>
                    <td className={claseCelda}>{o.proveedores.nombre}</td>
                    <td className={claseCelda}>
                      {o.detalle_orden_pedido.map((l) => (
                        <div key={l.id}>
                          {l.productos.nombre}:{' '}
                          <span className="text-slate-600 dark:text-slate-400">
                            {formatearStock(l.productos, l.cantidad_recibida)} /{' '}
                            {formatearStock(l.productos, l.cantidad)}
                          </span>
                        </div>
                      ))}
                      {o.notas && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Notas: {o.notas}
                        </div>
                      )}
                      {o.motivo_cancelacion && (
                        <div className="text-xs text-red-700 dark:text-red-400">
                          Cancelada: {o.motivo_cancelacion}
                        </div>
                      )}
                    </td>
                    <td className={claseCelda}>{o.creador?.nombre ?? '—'}</td>
                    <td className={`${claseCelda} ${COLOR_ESTADO_ORDEN[o.estado]}`}>
                      {NOMBRE_ESTADO_ORDEN[o.estado]}
                    </td>
                    <td className={`${claseCelda} space-y-1 whitespace-nowrap`}>
                      {/* Recibir: bodega, si la orden admite recepciones */}
                      {puedeRecibir &&
                        (o.estado === 'pendiente' || o.estado === 'recibida_parcial') && (
                          <button
                            type="button"
                            className={`${claseBotonTabla} block`}
                            onClick={() => setRecibiendoId(o.id)}
                          >
                            Recibir
                          </button>
                        )}

                      {/* Cancelar: con motivo */}
                      {puedeCancelar(o) && cancelandoId !== o.id && (
                        <button
                          type="button"
                          className={`${claseBotonTabla} block`}
                          onClick={() => {
                            setCancelandoId(o.id)
                            setMotivo('')
                            setError(null)
                          }}
                        >
                          Cancelar
                        </button>
                      )}
                      {cancelandoId === o.id && (
                        <div className="flex flex-col gap-1">
                          <input
                            placeholder="Motivo"
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            className={`${claseInput} mt-0`}
                          />
                          <div className="space-x-3">
                            <button
                              type="button"
                              className={claseBotonTabla}
                              onClick={confirmarCancelacion}
                              disabled={cancelar.isPending}
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              className={claseBotonTabla}
                              onClick={() => setCancelandoId(null)}
                            >
                              Volver
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {ordenes.data.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                    >
                      Todavía no hay órdenes de pedido.
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
