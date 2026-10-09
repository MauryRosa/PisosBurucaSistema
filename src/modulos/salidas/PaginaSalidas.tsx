/**
 * PaginaSalidas.tsx
 * Órdenes de salida por venta (RF-15 a RF-18, RF-29 a RF-32):
 *  - Salida por venta: sale de la bodega principal.
 *  - Despacho de minibodega: el cliente retira en sala de ventas.
 * Siempre ligada a una factura o recibo del sistema comercial.
 * Si hay reservas con el mismo comprobante, se pueden cargar sus productos
 * y la base de datos las consume automáticamente.
 */
import { useState } from 'react'
import { CapturaLineas, type LineaCaptura } from '@/components/CapturaLineas'
import { Campo } from '@/components/Campo'
import { HistorialDocumentos } from '@/components/HistorialDocumentos'
import { abrirImpresion } from '@/lib/impresion'
import { claseBoton, claseBotonSecundario, claseInput } from '@/components/estilos'
import { NOMBRE_TIPO_DOCUMENTO, useCrearDocumento, type TipoComprobante } from '@/lib/documentos'
import { mensajeError } from '@/lib/supabase'
import { formatearStock } from '@/lib/unidades'
import { useProductos, useUbicaciones } from '@/modulos/catalogo/api'
import { useReservas } from '@/modulos/reservas/api'

// Tipos de salida que maneja esta pantalla
const TIPOS_SALIDA = ['salida_venta', 'despacho_minibodega'] as const
type TipoSalida = (typeof TIPOS_SALIDA)[number]

/** Mensaje de resultado al guardar. */
type Mensaje = { tipo: 'ok' | 'error'; texto: string } | null

/**
 * PaginaSalidas: formulario de orden de salida + historial con impresión.
 */
export function PaginaSalidas() {
  // Datos necesarios
  const productos = useProductos()
  const ubicaciones = useUbicaciones()
  const reservas = useReservas(true) // solo activas
  const crear = useCrearDocumento()

  // Estado del formulario
  const [tipo, setTipo] = useState<TipoSalida>('salida_venta')
  const [miniElegida, setMiniElegida] = useState<number | null>(null)
  const [tipoComprobante, setTipoComprobante] = useState<TipoComprobante>('factura')
  const [numero, setNumero] = useState('')
  const [retiraNombre, setRetiraNombre] = useState('')
  const [retiraPlaca, setRetiraPlaca] = useState('')
  const [lineas, setLineas] = useState<LineaCaptura[]>([])
  const [mensaje, setMensaje] = useState<Mensaje>(null)
  const [ultimoDoc, setUltimoDoc] = useState<{ id: number; numero: string } | null>(null)

  // Ubicaciones: bodega principal y minibodegas
  const principal = ubicaciones.data?.find((u) => u.es_principal)
  const minibodegas = ubicaciones.data?.filter((u) => !u.es_principal && u.activa) ?? []

  // Origen según el tipo: principal para ventas; minibodega para despachos
  const origen =
    tipo === 'salida_venta' ? (principal?.id ?? null) : (miniElegida ?? minibodegas[0]?.id ?? null)

  // Reservas activas con el mismo comprobante y en el mismo origen
  // (el React Compiler memoriza este cálculo automáticamente)
  const numeroLimpio = numero.trim()
  const reservasDelComprobante = (reservas.data ?? []).filter(
    (r) =>
      numeroLimpio !== '' &&
      r.tipo_comprobante === tipoComprobante &&
      r.numero_comprobante === numeroLimpio &&
      r.ubicacion_id === origen,
  )

  /**
   * usarReservas: llena las líneas con los productos de las reservas encontradas.
   * Si hay varias reservas del mismo producto, suma sus cantidades.
   */
  const usarReservas = () => {
    const nuevas: LineaCaptura[] = []
    for (const r of reservasDelComprobante) {
      const producto = productos.data?.find((p) => p.id === r.producto_id)
      if (!producto) continue
      const indice = nuevas.findIndex((l) => l.producto.id === producto.id)
      if (indice >= 0) {
        // Ya estaba: reemplazar la línea con la cantidad sumada
        const anterior = nuevas[indice]!
        nuevas[indice] = { producto, cantidad: anterior.cantidad + r.cantidad }
      } else {
        nuevas.push({ producto, cantidad: r.cantidad })
      }
    }
    setLineas(nuevas)
  }

  /**
   * guardar: valida y registra la orden de salida con crear_documento.
   */
  const guardar = async () => {
    setMensaje(null)
    setUltimoDoc(null)

    if (!origen) return setMensaje({ tipo: 'error', texto: 'No hay ubicación de origen' })
    if (!numero.trim()) {
      return setMensaje({ tipo: 'error', texto: 'Escriba el número de factura o recibo' })
    }
    if (!retiraNombre.trim()) {
      return setMensaje({ tipo: 'error', texto: 'Escriba quién retira el producto' })
    }
    if (lineas.length === 0) {
      return setMensaje({ tipo: 'error', texto: 'Agregue al menos un producto' })
    }

    try {
      const doc = await crear.mutateAsync({
        tipo,
        lineas: lineas.map((l) => ({
          producto_id: l.producto.id,
          ubicacion_origen_id: origen,
          ubicacion_destino_id: null, // sale del inventario
          cantidad: l.cantidad,
        })),
        datos: {
          tipo_comprobante: tipoComprobante,
          numero_comprobante: numero.trim(),
          retira_nombre: retiraNombre.trim(),
          retira_placa: retiraPlaca.trim() || undefined,
          reserva_ids: reservasDelComprobante.map((r) => r.id),
        },
      })
      setUltimoDoc(doc)
      setMensaje({ tipo: 'ok', texto: `Orden de salida ${doc.numero} registrada.` })
      // Limpiar para la siguiente salida
      setNumero('')
      setRetiraNombre('')
      setRetiraPlaca('')
      setLineas([])
    } catch (e) {
      setMensaje({ tipo: 'error', texto: mensajeError(e) })
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Salidas por venta</h1>
        <p className="text-sm text-slate-500">
          Ningún producto sale de bodega sin su orden de salida ligada a la factura o recibo.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        {/* Tipo y origen */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Tipo de salida">
            <select
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value as TipoSalida)
                setLineas([]) // cambiar el origen invalida las líneas
              }}
              className={claseInput}
            >
              {TIPOS_SALIDA.map((t) => (
                <option key={t} value={t}>
                  {NOMBRE_TIPO_DOCUMENTO[t]}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Sale de">
            {tipo === 'salida_venta' ? (
              <input value={principal?.nombre ?? ''} disabled className={claseInput} />
            ) : (
              <select
                value={origen ?? ''}
                onChange={(e) => setMiniElegida(Number(e.target.value))}
                className={claseInput}
              >
                {minibodegas.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
              </select>
            )}
          </Campo>

          <Campo etiqueta="Comprobante">
            <select
              value={tipoComprobante}
              onChange={(e) => setTipoComprobante(e.target.value as TipoComprobante)}
              className={claseInput}
            >
              <option value="factura">Factura</option>
              <option value="recibo">Recibo</option>
            </select>
          </Campo>

          <Campo etiqueta="Número de factura o recibo">
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className={claseInput}
            />
          </Campo>
        </div>

        {/* Quién retira */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Retira (cliente o transportista)">
            <input
              value={retiraNombre}
              onChange={(e) => setRetiraNombre(e.target.value)}
              className={claseInput}
            />
          </Campo>
          <Campo etiqueta="Placa del vehículo (opcional)">
            <input
              value={retiraPlaca}
              onChange={(e) => setRetiraPlaca(e.target.value)}
              className={claseInput}
            />
          </Campo>
        </div>

        {/* Aviso de reservas con el mismo comprobante */}
        {reservasDelComprobante.length > 0 && (
          <div className="space-y-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm">
            <p className="font-medium text-green-800">
              Hay {reservasDelComprobante.length} reserva(s) con este comprobante. Se consumirán al
              registrar la salida:
            </p>
            <ul className="list-inside list-disc text-green-900">
              {reservasDelComprobante.map((r) => (
                <li key={r.id}>
                  {r.productos.nombre}: {formatearStock(r.productos, r.cantidad)} (
                  {r.vendedora?.nombre ?? 'sin vendedora'})
                </li>
              ))}
            </ul>
            <button type="button" onClick={usarReservas} className={claseBotonSecundario}>
              Usar productos de la reserva
            </button>
          </div>
        )}

        {/* Productos */}
        <CapturaLineas productos={productos.data ?? []} lineas={lineas} onCambiar={setLineas} />

        {mensaje && (
          <p className={`text-sm ${mensaje.tipo === 'ok' ? 'text-green-700' : 'text-red-700'}`}>
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
            {crear.isPending ? 'Guardando…' : 'Registrar orden de salida'}
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

      <HistorialDocumentos tipos={[...TIPOS_SALIDA]} titulo="Últimas salidas" imprimible />
    </section>
  )
}
