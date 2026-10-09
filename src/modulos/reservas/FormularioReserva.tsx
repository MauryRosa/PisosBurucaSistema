/**
 * FormularioReserva.tsx
 * Formulario para que el jefe de bodega registre una reserva
 * a pedido de una vendedora (RF-26). Muestra el disponible del producto
 * elegido para evitar reservar de más.
 */
import { useState } from 'react'
import { Campo } from '@/components/Campo'
import { SelectorProducto } from '@/components/SelectorProducto'
import { claseBoton, claseInput } from '@/components/estilos'
import type { TipoComprobante } from '@/lib/documentos'
import { mensajeError } from '@/lib/supabase'
import { aUnidadBase, formatearStock } from '@/lib/unidades'
import { useProductos, useUbicaciones } from '@/modulos/catalogo/api'
import type { Producto } from '@/modulos/catalogo/tipos'
import { useStock } from '@/modulos/stock/api'
import { useCrearReserva, useVendedoras } from './api'

/** Mensaje de resultado al guardar. */
type Mensaje = { tipo: 'ok' | 'error'; texto: string } | null

/**
 * FormularioReserva: captura producto, cantidad, vendedora y comprobante.
 */
export function FormularioReserva() {
  // Datos necesarios
  const productos = useProductos()
  const ubicaciones = useUbicaciones()
  const vendedoras = useVendedoras()
  const stock = useStock()
  const crear = useCrearReserva()

  // Estado del formulario
  const [producto, setProducto] = useState<Producto | null>(null)
  const [ubicacionElegida, setUbicacionElegida] = useState<number | null>(null)
  const [cajas, setCajas] = useState('')
  const [piezas, setPiezas] = useState('')
  const [vendedoraId, setVendedoraId] = useState('')
  const [tipoComprobante, setTipoComprobante] = useState<TipoComprobante | ''>('')
  const [numeroComprobante, setNumeroComprobante] = useState('')
  const [notas, setNotas] = useState('')
  const [mensaje, setMensaje] = useState<Mensaje>(null)

  // Ubicación: la elegida o, por defecto, la bodega principal
  const ubicacionId = ubicacionElegida ?? ubicaciones.data?.find((u) => u.es_principal)?.id ?? null

  // Disponible del producto elegido en la ubicación elegida
  const filaStock = stock.data?.find(
    (f) => f.producto_id === producto?.id && f.ubicacion_id === ubicacionId,
  )
  const disponible = filaStock?.disponible ?? 0
  const esPiso = producto?.tipo === 'piso'

  /**
   * limpiar: deja el formulario listo para otra reserva.
   */
  const limpiar = () => {
    setProducto(null)
    setCajas('')
    setPiezas('')
    setTipoComprobante('')
    setNumeroComprobante('')
    setNotas('')
  }

  /**
   * guardar: valida y registra la reserva con crear_reserva.
   */
  const guardar = async () => {
    setMensaje(null)
    if (!producto || !ubicacionId) {
      return setMensaje({ tipo: 'error', texto: 'Elija producto y ubicación' })
    }
    if (!vendedoraId) return setMensaje({ tipo: 'error', texto: 'Elija la vendedora' })
    // Comprobante: si se da el tipo, se necesita el número (y viceversa)
    if (Boolean(tipoComprobante) !== Boolean(numeroComprobante.trim())) {
      return setMensaje({
        tipo: 'error',
        texto: 'Indique tipo y número de comprobante, o deje ambos vacíos',
      })
    }

    let cantidad: number
    try {
      cantidad = aUnidadBase(producto, {
        cajas: esPiso ? Number(cajas || 0) : 0,
        piezas: Number(piezas || 0),
      })
    } catch (e) {
      return setMensaje({
        tipo: 'error',
        texto: e instanceof Error ? e.message : 'Cantidad no válida',
      })
    }
    if (cantidad <= 0)
      return setMensaje({ tipo: 'error', texto: 'Escriba una cantidad mayor a cero' })
    if (cantidad > disponible) {
      return setMensaje({
        tipo: 'error',
        texto: `Solo hay disponible ${formatearStock(producto, disponible)}`,
      })
    }

    try {
      await crear.mutateAsync({
        producto_id: producto.id,
        ubicacion_id: ubicacionId,
        cantidad,
        vendedora_id: vendedoraId,
        tipo_comprobante: tipoComprobante || null,
        numero_comprobante: numeroComprobante.trim() || null,
        notas: notas.trim() || null,
      })
      setMensaje({
        tipo: 'ok',
        texto: `Reserva registrada: ${producto.nombre}, ${formatearStock(producto, cantidad)}.`,
      })
      limpiar()
    } catch (e) {
      setMensaje({ tipo: 'error', texto: mensajeError(e) })
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">Nueva reserva</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Producto</span>
          <SelectorProducto
            productos={productos.data ?? []}
            seleccionado={producto}
            onSeleccionar={setProducto}
          />
          {producto && (
            <span className="text-xs text-slate-500">
              Disponible: {formatearStock(producto, disponible)}
            </span>
          )}
        </label>

        <Campo etiqueta="Ubicación">
          <select
            value={ubicacionId ?? ''}
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <Campo etiqueta="Vendedora que la pide">
          <select
            value={vendedoraId}
            onChange={(e) => setVendedoraId(e.target.value)}
            className={claseInput}
          >
            <option value="">— Elija —</option>
            {vendedoras.data?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo etiqueta="Comprobante (opcional)" ayuda="Si ya se facturó o se hizo recibo">
          <select
            value={tipoComprobante}
            onChange={(e) => setTipoComprobante(e.target.value as TipoComprobante | '')}
            className={claseInput}
          >
            <option value="">— Sin comprobante —</option>
            <option value="factura">Factura</option>
            <option value="recibo">Recibo</option>
          </select>
        </Campo>
        <Campo etiqueta="Número de comprobante">
          <input
            value={numeroComprobante}
            onChange={(e) => setNumeroComprobante(e.target.value)}
            disabled={!tipoComprobante}
            className={claseInput}
          />
        </Campo>
        <Campo etiqueta="Notas (opcional)">
          <input value={notas} onChange={(e) => setNotas(e.target.value)} className={claseInput} />
        </Campo>
      </div>

      {mensaje && (
        <p className={`text-sm ${mensaje.tipo === 'ok' ? 'text-green-700' : 'text-red-700'}`}>
          {mensaje.texto}
        </p>
      )}

      <button type="button" onClick={guardar} disabled={crear.isPending} className={claseBoton}>
        {crear.isPending ? 'Guardando…' : 'Registrar reserva'}
      </button>
    </div>
  )
}
