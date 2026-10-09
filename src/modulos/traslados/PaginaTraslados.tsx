/**
 * PaginaTraslados.tsx
 * Traslados entre ubicaciones (RF-19), normalmente de bodega principal
 * a la minibodega de sala de ventas. Llevan su propia serie (TRA).
 * Las reservas marcadas viajan con el producto a la ubicación destino,
 * para que el despacho de minibodega las consuma después (RF-32).
 */
import { useState } from 'react'
import { CapturaLineas, type LineaCaptura } from '@/components/CapturaLineas'
import { Campo } from '@/components/Campo'
import { HistorialDocumentos } from '@/components/HistorialDocumentos'
import { claseBoton, claseBotonSecundario, claseInput } from '@/components/estilos'
import { useCrearDocumento } from '@/lib/documentos'
import { abrirImpresion } from '@/lib/impresion'
import { mensajeError } from '@/lib/supabase'
import { formatearStock } from '@/lib/unidades'
import { useProductos, useUbicaciones } from '@/modulos/catalogo/api'
import { useReservas } from '@/modulos/reservas/api'

/** Mensaje de resultado al guardar. */
type Mensaje = { tipo: 'ok' | 'error'; texto: string } | null

/**
 * PaginaTraslados: formulario de traslado + historial con impresión.
 */
export function PaginaTraslados() {
  // Datos necesarios
  const productos = useProductos()
  const ubicaciones = useUbicaciones()
  const reservas = useReservas(true) // solo activas
  const crear = useCrearDocumento()

  // Estado del formulario
  const [origenElegido, setOrigenElegido] = useState<number | null>(null)
  const [destinoElegido, setDestinoElegido] = useState<number | null>(null)
  const [motivo, setMotivo] = useState('')
  const [lineas, setLineas] = useState<LineaCaptura[]>([])
  const [marcadas, setMarcadas] = useState<number[]>([]) // ids de reservas que viajan
  const [mensaje, setMensaje] = useState<Mensaje>(null)
  const [ultimoDoc, setUltimoDoc] = useState<{ id: number; numero: string } | null>(null)

  // Ubicaciones activas. Por defecto: de la principal hacia la primera que no sea el origen
  const activas = ubicaciones.data?.filter((u) => u.activa) ?? []
  const origen = origenElegido ?? activas.find((u) => u.es_principal)?.id ?? null
  const destino = destinoElegido ?? activas.find((u) => u.id !== origen)?.id ?? null

  // Reservas activas que están en el origen (candidatas a viajar)
  const reservasEnOrigen = (reservas.data ?? []).filter((r) => r.ubicacion_id === origen)
  const reservasMarcadas = reservasEnOrigen.filter((r) => marcadas.includes(r.id))

  /**
   * reservadoPorProducto: suma, por producto, lo reservado en las reservas marcadas.
   */
  const reservadoPorProducto = () => {
    const totales = new Map<number, number>()
    for (const r of reservasMarcadas) {
      totales.set(r.producto_id, (totales.get(r.producto_id) ?? 0) + r.cantidad)
    }
    return totales
  }

  /**
   * cambiarOrigen: al cambiar el origen se limpian líneas y reservas marcadas,
   * porque pertenecen a la ubicación anterior.
   */
  const cambiarOrigen = (id: number) => {
    setOrigenElegido(id)
    setLineas([])
    setMarcadas([])
  }

  /** alternarReserva: marca o desmarca una reserva para que viaje con el producto. */
  const alternarReserva = (id: number) => {
    setMarcadas((actual) =>
      actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id],
    )
  }

  /**
   * agregarProductosDeReservas: asegura que cada producto de las reservas marcadas
   * esté en las líneas con al menos la cantidad reservada.
   */
  const agregarProductosDeReservas = () => {
    let nuevas = [...lineas]
    for (const [productoId, reservado] of reservadoPorProducto()) {
      const producto = productos.data?.find((p) => p.id === productoId)
      if (!producto) continue
      const existente = nuevas.find((l) => l.producto.id === productoId)
      if (!existente) {
        nuevas = [...nuevas, { producto, cantidad: reservado }]
      } else if (existente.cantidad < reservado) {
        nuevas = nuevas.map((l) =>
          l.producto.id === productoId ? { ...l, cantidad: reservado } : l,
        )
      }
    }
    setLineas(nuevas)
  }

  /**
   * guardar: valida y registra el traslado con crear_documento (serie TRA).
   */
  const guardar = async () => {
    setMensaje(null)
    setUltimoDoc(null)

    if (!origen || !destino) {
      return setMensaje({ tipo: 'error', texto: 'Elija origen y destino' })
    }
    if (origen === destino) {
      return setMensaje({ tipo: 'error', texto: 'El origen y el destino deben ser distintos' })
    }
    if (lineas.length === 0) {
      return setMensaje({ tipo: 'error', texto: 'Agregue al menos un producto' })
    }

    // Lo trasladado de cada producto debe cubrir lo reservado que viaja con él
    for (const [productoId, reservado] of reservadoPorProducto()) {
      const linea = lineas.find((l) => l.producto.id === productoId)
      if (!linea || linea.cantidad < reservado) {
        const nombre = productos.data?.find((p) => p.id === productoId)?.nombre ?? 'un producto'
        return setMensaje({
          tipo: 'error',
          texto: `La cantidad a trasladar de "${nombre}" es menor que lo reservado marcado.`,
        })
      }
    }

    try {
      const doc = await crear.mutateAsync({
        tipo: 'traslado',
        lineas: lineas.map((l) => ({
          producto_id: l.producto.id,
          ubicacion_origen_id: origen, // sale de aquí
          ubicacion_destino_id: destino, // entra aquí
          cantidad: l.cantidad,
        })),
        datos: {
          motivo: motivo.trim() || undefined,
          reserva_ids: marcadas, // estas reservas se mueven al destino
        },
      })
      setUltimoDoc(doc)
      setMensaje({ tipo: 'ok', texto: `Traslado ${doc.numero} registrado.` })
      // Limpiar para el siguiente traslado
      setLineas([])
      setMarcadas([])
      setMotivo('')
    } catch (e) {
      setMensaje({ tipo: 'error', texto: mensajeError(e) })
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Traslados</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Movimiento de producto entre ubicaciones, con su propia serie de correlativo (TRA).
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        {/* Origen, destino y observaciones */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo etiqueta="Sale de">
            <select
              value={origen ?? ''}
              onChange={(e) => cambiarOrigen(Number(e.target.value))}
              className={claseInput}
            >
              {activas.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Entra a">
            <select
              value={destino ?? ''}
              onChange={(e) => setDestinoElegido(Number(e.target.value))}
              className={claseInput}
            >
              {activas
                .filter((u) => u.id !== origen)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
            </select>
          </Campo>
          <Campo etiqueta="Observaciones (opcional)">
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className={claseInput}
            />
          </Campo>
        </div>

        {/* Reservas en el origen que pueden viajar con el producto */}
        {reservasEnOrigen.length > 0 && (
          <div className="space-y-2 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 text-sm">
            <p className="font-medium">
              Reservas activas en el origen. Marque las que viajan con este traslado:
            </p>
            <ul className="space-y-1">
              {reservasEnOrigen.map((r) => (
                <li key={r.id}>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={marcadas.includes(r.id)}
                      onChange={() => alternarReserva(r.id)}
                    />
                    {r.productos.nombre}: {formatearStock(r.productos, r.cantidad)} ·{' '}
                    {r.vendedora?.nombre ?? 'sin vendedora'}
                    {r.numero_comprobante &&
                      ` · ${r.tipo_comprobante === 'factura' ? 'Factura' : 'Recibo'} ${r.numero_comprobante}`}
                  </label>
                </li>
              ))}
            </ul>
            {reservasMarcadas.length > 0 && (
              <button
                type="button"
                onClick={agregarProductosDeReservas}
                className={claseBotonSecundario}
              >
                Agregar productos de las reservas marcadas
              </button>
            )}
          </div>
        )}

        {/* Productos */}
        <CapturaLineas productos={productos.data ?? []} lineas={lineas} onCambiar={setLineas} />

        {mensaje && (
          <p
            className={`text-sm ${mensaje.tipo === 'ok' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}
          >
            {mensaje.texto}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={guardar}
            disabled={crear.isPending || lineas.length === 0}
            className={claseBoton}
          >
            {crear.isPending ? 'Guardando…' : 'Registrar traslado'}
          </button>
          {ultimoDoc && (
            <button
              type="button"
              onClick={() => abrirImpresion(ultimoDoc.id)}
              className={claseBotonSecundario}
            >
              Imprimir {ultimoDoc.numero}
            </button>
          )}
        </div>
      </div>

      <HistorialDocumentos tipos={['traslado']} titulo="Últimos traslados" imprimible />
    </section>
  )
}
