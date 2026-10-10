/**
 * RecepcionOrden.tsx
 * Recepción de una orden de pedido (RF-10, RF-11): por cada producto muestra
 * pedido, recibido y pendiente; bodega escribe lo que llegó y el sistema
 * indica si está completo, si falta o si sobra.
 */
import { useState } from 'react'
import { Campo } from '@/components/Campo'
import {
  claseBoton,
  claseBotonSecundario,
  claseCelda,
  claseEncabezado,
  claseInput,
  claseTabla,
} from '@/components/estilos'
import { abrirImpresion } from '@/lib/impresion'
import { mensajeError } from '@/lib/supabase'
import { aUnidadBase, desglosar, formatearStock } from '@/lib/unidades'
import { useUbicaciones } from '@/modulos/catalogo/api'
import { useRecibirOrden } from './api'
import type { LineaOrden, OrdenPedido } from './tipos'

interface Props {
  orden: OrdenPedido
  onCerrar: () => void // volver a la lista
}

/** Lo que el usuario escribe por producto. */
type Captura = Record<number, { cajas: string; piezas: string }>

/**
 * pendienteDe: lo que falta recibir de una línea (nunca negativo).
 */
function pendienteDe(l: LineaOrden): number {
  return Math.max(0, l.cantidad - l.cantidad_recibida)
}

/**
 * capturaInicial: llena cada producto con lo pendiente (lo más común es
 * que llegue completo; bodega solo corrige lo que vino distinto).
 */
function capturaInicial(orden: OrdenPedido): Captura {
  const inicial: Captura = {}
  for (const l of orden.detalle_orden_pedido) {
    const d = desglosar(l.productos, pendienteDe(l))
    inicial[l.id] =
      l.productos.tipo === 'piso'
        ? { cajas: String(d.cajas), piezas: String(d.piezasSueltas) }
        : { cajas: '', piezas: String(d.piezasTotales) }
  }
  return inicial
}

/**
 * RecepcionOrden: tabla de recepción, datos del proveedor y registro.
 */
export function RecepcionOrden({ orden, onCerrar }: Props) {
  const ubicaciones = useUbicaciones()
  const recibir = useRecibirOrden()

  const [captura, setCaptura] = useState<Captura>(() => capturaInicial(orden))
  const [documentoProveedor, setDocumentoProveedor] = useState('')
  const [ubicacionElegida, setUbicacionElegida] = useState<number | null>(null)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [ultimoDoc, setUltimoDoc] = useState<{ id: number; numero: string } | null>(null)

  const ubicacion = ubicacionElegida ?? ubicaciones.data?.find((u) => u.es_principal)?.id ?? null

  /** cambiar: actualiza cajas o piezas de un producto. */
  const cambiar = (lineaId: number, campo: 'cajas' | 'piezas', valor: string) => {
    setCaptura((actual) => {
      const previo = actual[lineaId] ?? { cajas: '', piezas: '' }
      return { ...actual, [lineaId]: { ...previo, [campo]: valor } }
    })
  }

  /**
   * recibeAhora: convierte lo escrito de un producto a unidad base.
   * Devuelve null si lo escrito no es válido (decimales, negativos).
   */
  const recibeAhora = (l: LineaOrden): number | null => {
    const c = captura[l.id] ?? { cajas: '', piezas: '' }
    try {
      return aUnidadBase(l.productos, {
        cajas: l.productos.tipo === 'piso' ? Number(c.cajas || 0) : 0,
        piezas: Number(c.piezas || 0),
      })
    } catch {
      return null
    }
  }

  /** comparacion: texto y color de lo recibido contra lo pendiente (RF-11). */
  const comparacion = (l: LineaOrden): { texto: string; color: string } => {
    const ahora = recibeAhora(l)
    if (ahora === null)
      return { texto: 'Cantidad no válida', color: 'text-red-700 dark:text-red-400' }
    const diferencia = ahora - pendienteDe(l)
    if (ahora === 0) return { texto: 'No llegó', color: 'text-slate-500 dark:text-slate-400' }
    if (diferencia === 0) return { texto: 'Completo', color: 'text-green-700 dark:text-green-400' }
    if (diferencia < 0) {
      return {
        texto: `Faltan ${formatearStock(l.productos, -diferencia)}`,
        color: 'text-amber-700 dark:text-amber-400',
      }
    }
    return {
      texto: `Sobran ${formatearStock(l.productos, diferencia)}`,
      color: 'text-blue-700 dark:text-sky-400',
    }
  }

  /** registrar: valida y registra la recepción como entrada de compra. */
  const registrar = async () => {
    setMensaje(null)
    if (!documentoProveedor.trim()) {
      return setMensaje({
        tipo: 'error',
        texto: 'Escriba la factura o nota de remisión del proveedor',
      })
    }
    if (!ubicacion) return setMensaje({ tipo: 'error', texto: 'Elija la ubicación' })

    const lineas: { producto_id: number; cantidad: number }[] = []
    for (const l of orden.detalle_orden_pedido) {
      const cantidad = recibeAhora(l)
      if (cantidad === null) {
        return setMensaje({ tipo: 'error', texto: `Cantidad no válida en ${l.productos.nombre}` })
      }
      if (cantidad > 0) lineas.push({ producto_id: l.producto_id, cantidad })
    }
    if (lineas.length === 0) {
      return setMensaje({ tipo: 'error', texto: 'No hay cantidades recibidas' })
    }

    try {
      const doc = await recibir.mutateAsync({
        orden_id: orden.id,
        lineas,
        documento_proveedor: documentoProveedor.trim(),
        ubicacion_id: ubicacion,
      })
      setUltimoDoc(doc)
      setMensaje({ tipo: 'ok', texto: `Recepción registrada como entrada ${doc.numero}.` })
    } catch (e) {
      setMensaje({ tipo: 'error', texto: mensajeError(e) })
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <h2 className="font-semibold">
        Recibir {orden.numero} · {orden.proveedores.nombre}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Factura o nota de remisión del proveedor">
          <input
            value={documentoProveedor}
            onChange={(e) => setDocumentoProveedor(e.target.value)}
            className={claseInput}
          />
        </Campo>
        <Campo etiqueta="Entra a">
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
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className={claseTabla}>
          <thead className={claseEncabezado}>
            <tr>
              <th className={claseCelda}>Producto</th>
              <th className={claseCelda}>Pedido</th>
              <th className={claseCelda}>Ya recibido</th>
              <th className={claseCelda}>Pendiente</th>
              <th className={claseCelda}>Llega ahora</th>
              <th className={claseCelda}>Comparación</th>
            </tr>
          </thead>
          <tbody>
            {orden.detalle_orden_pedido.map((l) => {
              const esPiso = l.productos.tipo === 'piso'
              const c = captura[l.id] ?? { cajas: '', piezas: '' }
              const comp = comparacion(l)
              return (
                <tr
                  key={l.id}
                  className="border-t border-slate-100 dark:border-slate-800 align-top"
                >
                  <td className={claseCelda}>{l.productos.nombre}</td>
                  <td className={claseCelda}>{formatearStock(l.productos, l.cantidad)}</td>
                  <td className={claseCelda}>{formatearStock(l.productos, l.cantidad_recibida)}</td>
                  <td className={claseCelda}>{formatearStock(l.productos, pendienteDe(l))}</td>
                  <td className={claseCelda}>
                    <div className="flex gap-2">
                      {esPiso && (
                        <input
                          type="number"
                          min={0}
                          placeholder="Cajas"
                          value={c.cajas}
                          onChange={(e) => cambiar(l.id, 'cajas', e.target.value)}
                          className={`${claseInput} mt-0 w-20`}
                        />
                      )}
                      <input
                        type="number"
                        min={0}
                        placeholder={esPiso ? 'Piezas' : l.productos.unidad}
                        value={c.piezas}
                        onChange={(e) => cambiar(l.id, 'piezas', e.target.value)}
                        className={`${claseInput} mt-0 w-20`}
                      />
                    </div>
                  </td>
                  <td className={`${claseCelda} ${comp.color}`}>{comp.texto}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {mensaje && (
        <p
          className={`text-sm ${mensaje.tipo === 'ok' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}
        >
          {mensaje.texto}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {!ultimoDoc && (
          <button
            type="button"
            onClick={registrar}
            disabled={recibir.isPending}
            className={claseBoton}
          >
            {recibir.isPending ? 'Guardando…' : 'Registrar recepción'}
          </button>
        )}
        {ultimoDoc && (
          <button
            type="button"
            onClick={() => abrirImpresion(ultimoDoc.id)}
            className={claseBotonSecundario}
          >
            Imprimir {ultimoDoc.numero}
          </button>
        )}
        <button type="button" onClick={onCerrar} className={claseBotonSecundario}>
          {ultimoDoc ? 'Listo' : 'Cancelar'}
        </button>
      </div>
    </div>
  )
}
