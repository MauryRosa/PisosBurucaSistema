/**
 * PaginaReservas.tsx
 * Pantalla de reservas (RF-26 a RF-28): formulario de nueva reserva
 * y tabla de reservas con opción de cancelar indicando el motivo.
 * Solo jefe de bodega y administrador.
 */
import { useState } from 'react'
import {
  claseBotonTabla,
  claseCelda,
  claseEncabezado,
  claseInput,
  claseTabla,
} from '@/components/estilos'
import { mensajeError } from '@/lib/supabase'
import { formatearStock } from '@/lib/unidades'
import { useCancelarReserva, useReservas, type EstadoReserva } from './api'
import { FormularioReserva } from './FormularioReserva'

/** Color de cada estado. */
const COLOR_ESTADO: Record<EstadoReserva, string> = {
  activa: 'text-green-700',
  consumida: 'text-slate-500',
  cancelada: 'text-red-700',
}

/**
 * PaginaReservas: formulario + tabla de reservas.
 */
export function PaginaReservas() {
  const [soloActivas, setSoloActivas] = useState(true) // filtro de la tabla
  const reservas = useReservas(soloActivas)
  const cancelar = useCancelarReserva()

  // Reserva que se está cancelando (muestra el campo de motivo en su fila)
  const [cancelandoId, setCancelandoId] = useState<number | null>(null)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)

  /**
   * confirmarCancelacion: cancela la reserva elegida con el motivo escrito.
   */
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
        <h1 className="text-2xl font-semibold">Reservas</h1>
        <p className="text-sm text-slate-500">
          Producto apartado a pedido de una vendedora. Se resta del disponible y se consume al
          registrar la salida con el mismo número de factura o recibo.
        </p>
      </div>

      <FormularioReserva />

      {/* Tabla de reservas */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{soloActivas ? 'Reservas activas' : 'Últimas reservas'}</h2>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={!soloActivas}
              onChange={(e) => setSoloActivas(!e.target.checked)}
            />
            Ver todas (consumidas y canceladas)
          </label>
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}
        {reservas.isPending && <p className="text-slate-500">Cargando…</p>}
        {reservas.isError && <p className="text-red-700">{mensajeError(reservas.error)}</p>}

        {reservas.isSuccess && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className={claseTabla}>
              <thead className={claseEncabezado}>
                <tr>
                  <th className={claseCelda}>Fecha</th>
                  <th className={claseCelda}>Producto</th>
                  <th className={claseCelda}>Ubicación</th>
                  <th className={claseCelda}>Cantidad</th>
                  <th className={claseCelda}>Vendedora</th>
                  <th className={claseCelda}>Comprobante</th>
                  <th className={claseCelda}>Notas</th>
                  <th className={claseCelda}>Estado</th>
                  <th className={claseCelda}></th>
                </tr>
              </thead>
              <tbody>
                {reservas.data.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 align-top">
                    <td className={`${claseCelda} whitespace-nowrap`}>
                      {new Date(r.creado_en).toLocaleString('es-SV')}
                    </td>
                    <td className={claseCelda}>
                      <span className="font-mono text-xs">{r.productos.codigo}</span> ·{' '}
                      {r.productos.nombre}
                    </td>
                    <td className={claseCelda}>{r.ubicaciones.nombre}</td>
                    <td className={claseCelda}>{formatearStock(r.productos, r.cantidad)}</td>
                    <td className={claseCelda}>{r.vendedora?.nombre ?? '—'}</td>
                    <td className={claseCelda}>
                      {r.numero_comprobante
                        ? `${r.tipo_comprobante === 'factura' ? 'Factura' : 'Recibo'} ${r.numero_comprobante}`
                        : '—'}
                    </td>
                    <td className={claseCelda}>
                      {r.notas ?? ''}
                      {r.motivo_cancelacion && (
                        <span className="block text-xs text-red-700">
                          Cancelada: {r.motivo_cancelacion}
                        </span>
                      )}
                    </td>
                    <td className={`${claseCelda} capitalize ${COLOR_ESTADO[r.estado]}`}>
                      {r.estado}
                    </td>
                    <td className={`${claseCelda} whitespace-nowrap`}>
                      {/* Cancelar: solo reservas activas */}
                      {r.estado === 'activa' && cancelandoId !== r.id && (
                        <button
                          type="button"
                          className={claseBotonTabla}
                          onClick={() => {
                            setCancelandoId(r.id)
                            setMotivo('')
                            setError(null)
                          }}
                        >
                          Cancelar
                        </button>
                      )}
                      {cancelandoId === r.id && (
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
                {reservas.data.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
                      No hay reservas.
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
