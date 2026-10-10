/**
 * FormularioMovimiento.tsx
 * Registro de salidas que no son ventas (RF-20 a RF-24):
 *  - Merma (queda pendiente hasta que gerencia apruebe)
 *  - Consumo interno, exhibición, devolución a proveedor
 *  - Cambio o garantía (entra lo devuelto y sale el reemplazo)
 */
import { useState } from 'react'
import { CapturaLineas, type LineaCaptura } from '@/components/CapturaLineas'
import { Campo } from '@/components/Campo'
import { claseBoton, claseBotonSecundario, claseInput } from '@/components/estilos'
import {
  NOMBRE_TIPO_DOCUMENTO,
  useCrearDocumento,
  type DatosDocumento,
  type LineaDocumento,
  type TipoComprobante,
} from '@/lib/documentos'
import { subirEvidencia } from '@/lib/evidencias'
import { abrirImpresion } from '@/lib/impresion'
import { mensajeError } from '@/lib/supabase'
import { useProductos, useProveedores, useUbicaciones } from '@/modulos/catalogo/api'
import { TIPOS_MOVIMIENTO, type TipoMovimiento } from './tipos'

/** Explicación corta de cada tipo, para el usuario. */
const AYUDA: Record<TipoMovimiento, string> = {
  merma:
    'Producto dañado o quebrado. Adjunte la carta; el stock se descuenta cuando gerencia apruebe.',
  consumo_interno: 'Producto usado en la tienda, remodelación o mantenimiento.',
  exhibicion: 'Producto que se coloca como muestra en exhibición.',
  devolucion_proveedor: 'Producto que se devuelve al proveedor.',
  cambio_garantia: 'El cliente devuelve un producto y se le entrega otro en su lugar.',
}

/** Mensaje de resultado al guardar. */
type Mensaje = { tipo: 'ok' | 'error'; texto: string } | null

/**
 * FormularioMovimiento: campos según el tipo, captura de productos y registro.
 */
export function FormularioMovimiento() {
  // Datos necesarios
  const productos = useProductos()
  const proveedores = useProveedores()
  const ubicaciones = useUbicaciones()
  const crear = useCrearDocumento()

  // Estado del formulario
  const [tipo, setTipo] = useState<TipoMovimiento>('merma')
  const [ubicacionElegida, setUbicacionElegida] = useState<number | null>(null)
  const [motivo, setMotivo] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [tipoComprobante, setTipoComprobante] = useState<TipoComprobante>('factura')
  const [numero, setNumero] = useState('')
  const [salen, setSalen] = useState<LineaCaptura[]>([]) // productos que salen
  const [entran, setEntran] = useState<LineaCaptura[]>([]) // solo en cambio/garantía
  const [archivo, setArchivo] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<Mensaje>(null)
  const [ultimoDoc, setUltimoDoc] = useState<{ id: number; numero: string } | null>(null)

  const ubicacion = ubicacionElegida ?? ubicaciones.data?.find((u) => u.es_principal)?.id ?? null
  const esCambio = tipo === 'cambio_garantia'

  /**
   * limpiar: deja el formulario listo para otro movimiento (conserva tipo y ubicación).
   */
  const limpiar = () => {
    setMotivo('')
    setNumero('')
    setSalen([])
    setEntran([])
    setArchivo(null)
  }

  /**
   * validar: revisa los datos obligatorios según el tipo.
   * @returns Mensaje de error, o null si todo está bien.
   */
  const validar = (): string | null => {
    if (!ubicacion) return 'Elija la ubicación'
    if (salen.length === 0) return 'Agregue al menos un producto que sale'
    if (esCambio && entran.length === 0) return 'Agregue el producto que devuelve el cliente'
    if (esCambio && !numero.trim()) return 'Escriba el número de factura o recibo de la venta'
    if (tipo === 'devolucion_proveedor' && !proveedorId) return 'Elija el proveedor'
    if (['merma', 'consumo_interno', 'exhibicion'].includes(tipo) && !motivo.trim()) {
      return 'Escriba el motivo'
    }
    return null
  }

  /**
   * guardar: sube la evidencia (si hay), arma las líneas y registra el documento.
   */
  const guardar = async () => {
    setMensaje(null)
    setUltimoDoc(null)
    const error = validar()
    if (error) return setMensaje({ tipo: 'error', texto: error })

    setGuardando(true)
    try {
      // 1. Subir la carta o foto, si se adjuntó
      const evidencia = archivo ? await subirEvidencia(archivo) : undefined

      // 2. Líneas: lo que sale (origen) y, en cambios, lo que entra (destino)
      const lineas: LineaDocumento[] = [
        ...salen.map((l) => ({
          producto_id: l.producto.id,
          ubicacion_origen_id: ubicacion,
          ubicacion_destino_id: null,
          cantidad: l.cantidad,
        })),
        ...entran.map((l) => ({
          producto_id: l.producto.id,
          ubicacion_origen_id: null,
          ubicacion_destino_id: ubicacion,
          cantidad: l.cantidad,
        })),
      ]

      // 3. Datos de cabecera según el tipo
      const datos: DatosDocumento = { motivo: motivo.trim() || undefined, evidencia_url: evidencia }
      if (tipo === 'devolucion_proveedor') datos.proveedor_id = Number(proveedorId)
      if (esCambio) {
        datos.tipo_comprobante = tipoComprobante
        datos.numero_comprobante = numero.trim()
      }

      const doc = await crear.mutateAsync({ tipo, lineas, datos })
      setUltimoDoc(doc)
      setMensaje({
        tipo: 'ok',
        texto:
          tipo === 'merma'
            ? `Merma ${doc.numero} registrada. Queda pendiente de aprobación de gerencia.`
            : `${NOMBRE_TIPO_DOCUMENTO[tipo]} ${doc.numero} registrado.`,
      })
      limpiar()
    } catch (e) {
      setMensaje({ tipo: 'error', texto: mensajeError(e) })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <h2 className="font-semibold">Nuevo movimiento</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Campo etiqueta="Tipo de movimiento" ayuda={AYUDA[tipo]}>
          <select
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as TipoMovimiento)
              setEntran([])
            }}
            className={claseInput}
          >
            {TIPOS_MOVIMIENTO.map((t) => (
              <option key={t} value={t}>
                {NOMBRE_TIPO_DOCUMENTO[t]}
              </option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Ubicación">
          <select
            value={ubicacion ?? ''}
            onChange={(e) => {
              setUbicacionElegida(Number(e.target.value))
              setSalen([])
              setEntran([])
            }}
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

        <Campo etiqueta={tipo === 'devolucion_proveedor' || esCambio ? 'Observaciones' : 'Motivo'}>
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className={claseInput}
          />
        </Campo>

        {/* Devolución a proveedor: a quién se devuelve */}
        {tipo === 'devolucion_proveedor' && (
          <Campo etiqueta="Proveedor">
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className={claseInput}
            >
              <option value="">— Elija —</option>
              {proveedores.data
                ?.filter((p) => p.activo)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
            </select>
          </Campo>
        )}

        {/* Cambio o garantía: venta original */}
        {esCambio && (
          <>
            <Campo etiqueta="Comprobante de la venta">
              <select
                value={tipoComprobante}
                onChange={(e) => setTipoComprobante(e.target.value as TipoComprobante)}
                className={claseInput}
              >
                <option value="factura">Factura</option>
                <option value="recibo">Recibo</option>
              </select>
            </Campo>
            <Campo etiqueta="Número">
              <input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className={claseInput}
              />
            </Campo>
          </>
        )}

        <Campo
          etiqueta={tipo === 'merma' ? 'Carta de merma (foto o PDF)' : 'Evidencia (opcional)'}
          ayuda="Máximo 5 MB. También se puede adjuntar al aprobar."
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm"
          />
        </Campo>
      </div>

      {/* Productos que entran (solo cambio/garantía) */}
      {esCambio && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Entra: producto que devuelve el cliente
          </h3>
          <CapturaLineas productos={productos.data ?? []} lineas={entran} onCambiar={setEntran} />
        </div>
      )}

      {/* Productos que salen */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {esCambio ? 'Sale: producto de reemplazo' : 'Productos que salen'}
        </h3>
        <CapturaLineas productos={productos.data ?? []} lineas={salen} onCambiar={setSalen} />
      </div>

      {mensaje && (
        <p
          className={`text-sm ${mensaje.tipo === 'ok' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}
        >
          {mensaje.texto}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={guardar} disabled={guardando} className={claseBoton}>
          {guardando ? 'Guardando…' : 'Registrar movimiento'}
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
  )
}
