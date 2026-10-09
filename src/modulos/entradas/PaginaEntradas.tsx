/**
 * PaginaEntradas.tsx
 * Registro de entradas a bodega (RF-10 a RF-14):
 *  - Inventario inicial (conteo físico)
 *  - Compra a proveedor (con su factura o nota de remisión)
 *  - Devolución de cliente
 * Solo para jefe de bodega y administrador.
 */
import { useState } from 'react'
import { CapturaLineas, type LineaCaptura } from '@/components/CapturaLineas'
import { Campo } from '@/components/Campo'
import { HistorialDocumentos } from '@/components/HistorialDocumentos'
import { claseBoton, claseInput } from '@/components/estilos'
import { NOMBRE_TIPO_DOCUMENTO, useCrearDocumento, type DatosDocumento } from '@/lib/documentos'
import { mensajeError } from '@/lib/supabase'
import { useProductos, useProveedores, useUbicaciones } from '@/modulos/catalogo/api'

// Tipos de entrada que maneja esta pantalla
const TIPOS_ENTRADA = [
  'inventario_inicial',
  'entrada_compra',
  'entrada_devolucion_cliente',
] as const
type TipoEntrada = (typeof TIPOS_ENTRADA)[number]

/** Mensaje de resultado al guardar. */
type Mensaje = { tipo: 'ok' | 'error'; texto: string } | null

/**
 * PaginaEntradas: formulario de entrada + historial de las últimas entradas.
 */
export function PaginaEntradas() {
  // Datos del catálogo
  const productos = useProductos()
  const proveedores = useProveedores()
  const ubicaciones = useUbicaciones()
  const crear = useCrearDocumento()

  // Estado del formulario
  const [tipo, setTipo] = useState<TipoEntrada>('inventario_inicial')
  const [destinoElegido, setDestinoElegido] = useState<number | null>(null)
  const [proveedorId, setProveedorId] = useState('')
  const [documentoProveedor, setDocumentoProveedor] = useState('')
  const [motivo, setMotivo] = useState('')
  const [lineas, setLineas] = useState<LineaCaptura[]>([])
  const [mensaje, setMensaje] = useState<Mensaje>(null)

  // Ubicación destino: la elegida o, por defecto, la bodega principal
  const destino = destinoElegido ?? ubicaciones.data?.find((u) => u.es_principal)?.id ?? null

  /**
   * guardar: valida los datos y registra la entrada con crear_documento.
   */
  const guardar = async () => {
    setMensaje(null)

    // Validaciones antes de enviar
    if (!destino) return setMensaje({ tipo: 'error', texto: 'Elija la ubicación de destino' })
    if (lineas.length === 0) {
      return setMensaje({ tipo: 'error', texto: 'Agregue al menos un producto' })
    }
    if (tipo === 'entrada_compra' && (!proveedorId || !documentoProveedor.trim())) {
      return setMensaje({
        tipo: 'error',
        texto: 'Indique el proveedor y su factura o nota de remisión',
      })
    }

    // Datos de cabecera según el tipo
    const datos: DatosDocumento = {}
    if (tipo === 'entrada_compra') {
      datos.proveedor_id = Number(proveedorId)
      datos.documento_proveedor = documentoProveedor.trim()
    }
    if (motivo.trim()) datos.motivo = motivo.trim()

    try {
      const doc = await crear.mutateAsync({
        tipo,
        datos,
        // Todas las líneas entran a la ubicación destino
        lineas: lineas.map((l) => ({
          producto_id: l.producto.id,
          ubicacion_origen_id: null,
          ubicacion_destino_id: destino,
          cantidad: l.cantidad,
        })),
      })
      setMensaje({ tipo: 'ok', texto: `Entrada ${doc.numero} registrada correctamente.` })
      // Limpiar para la siguiente entrada (se conserva tipo, destino y proveedor)
      setLineas([])
      setDocumentoProveedor('')
      setMotivo('')
    } catch (e) {
      setMensaje({ tipo: 'error', texto: mensajeError(e) })
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Entradas</h1>
        <p className="text-sm text-slate-500">
          Inventario inicial, compras a proveedor y devoluciones de clientes.
        </p>
      </div>

      {/* Formulario */}
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Tipo de entrada">
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoEntrada)}
              className={claseInput}
            >
              {TIPOS_ENTRADA.map((t) => (
                <option key={t} value={t}>
                  {NOMBRE_TIPO_DOCUMENTO[t]}
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
              {ubicaciones.data
                ?.filter((u) => u.activa)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
            </select>
          </Campo>

          {/* Solo para compras */}
          {tipo === 'entrada_compra' && (
            <>
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
              <Campo etiqueta="Factura o nota de remisión">
                <input
                  value={documentoProveedor}
                  onChange={(e) => setDocumentoProveedor(e.target.value)}
                  className={claseInput}
                />
              </Campo>
            </>
          )}
        </div>

        <Campo etiqueta="Observaciones (opcional)">
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className={claseInput}
          />
        </Campo>

        {/* Productos y cantidades */}
        <CapturaLineas productos={productos.data ?? []} lineas={lineas} onCambiar={setLineas} />

        {mensaje && (
          <p className={`text-sm ${mensaje.tipo === 'ok' ? 'text-green-700' : 'text-red-700'}`}>
            {mensaje.texto}
          </p>
        )}

        <button
          type="button"
          onClick={guardar}
          disabled={crear.isPending || lineas.length === 0}
          className={claseBoton}
        >
          {crear.isPending ? 'Guardando…' : 'Registrar entrada'}
        </button>
      </div>

      {/* Historial */}
      <HistorialDocumentos tipos={[...TIPOS_ENTRADA]} titulo="Últimas entradas" />
    </section>
  )
}
