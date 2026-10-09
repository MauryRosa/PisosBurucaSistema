/**
 * FormularioOrden.tsx
 * Crear una orden de pedido a proveedor (RF-09).
 * Lo usan el administrador y las vendedoras.
 */
import { useState } from 'react'
import { CapturaLineas, type LineaCaptura } from '@/components/CapturaLineas'
import { Campo } from '@/components/Campo'
import { claseBoton, claseInput } from '@/components/estilos'
import { mensajeError } from '@/lib/supabase'
import { useProductos, useProveedores } from '@/modulos/catalogo/api'
import { useCrearOrden } from './api'

/**
 * FormularioOrden: proveedor, notas y productos con cantidades.
 */
export function FormularioOrden() {
  const productos = useProductos()
  const proveedores = useProveedores()
  const crear = useCrearOrden()

  const [proveedorId, setProveedorId] = useState('')
  const [notas, setNotas] = useState('')
  const [lineas, setLineas] = useState<LineaCaptura[]>([])
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  /** guardar: valida y crea la orden. */
  const guardar = async () => {
    setMensaje(null)
    if (!proveedorId) return setMensaje({ tipo: 'error', texto: 'Elija el proveedor' })
    if (lineas.length === 0) {
      return setMensaje({ tipo: 'error', texto: 'Agregue al menos un producto' })
    }
    try {
      const numero = await crear.mutateAsync({
        proveedor_id: Number(proveedorId),
        notas: notas.trim() || null,
        lineas: lineas.map((l) => ({ producto_id: l.producto.id, cantidad: l.cantidad })),
      })
      setMensaje({ tipo: 'ok', texto: `Orden ${numero} creada.` })
      setLineas([])
      setNotas('')
    } catch (e) {
      setMensaje({ tipo: 'error', texto: mensajeError(e) })
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">Nueva orden de pedido</h2>

      <div className="grid gap-4 sm:grid-cols-2">
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
        <Campo etiqueta="Notas (opcional)">
          <input value={notas} onChange={(e) => setNotas(e.target.value)} className={claseInput} />
        </Campo>
      </div>

      <CapturaLineas productos={productos.data ?? []} lineas={lineas} onCambiar={setLineas} />

      {mensaje && (
        <p className={`text-sm ${mensaje.tipo === 'ok' ? 'text-green-700' : 'text-red-700'}`}>
          {mensaje.texto}
        </p>
      )}

      <button type="button" onClick={guardar} disabled={crear.isPending} className={claseBoton}>
        {crear.isPending ? 'Guardando…' : 'Crear orden'}
      </button>
    </div>
  )
}
