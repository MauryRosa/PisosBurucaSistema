/**
 * ImprimirOrden.tsx
 * Orden de salida lista para imprimir o guardar en PDF (RF-31).
 * Se abre en una pestaña aparte, sin menú. El botón "Imprimir" usa el
 * diálogo del navegador, donde también se puede elegir "Guardar como PDF".
 */
import { useParams } from 'react-router'
import { NOMBRE_TIPO_DOCUMENTO } from '@/lib/documentos'
import { mensajeError } from '@/lib/supabase'
import { formatearStock } from '@/lib/unidades'
import { useDocumentoImprimible } from './api'

/**
 * ImprimirOrden: lee el id de la dirección (/imprimir/:id) y dibuja la orden.
 */
export function ImprimirOrden() {
  const { id } = useParams()
  const documento = useDocumentoImprimible(Number(id))

  if (documento.isPending) return <p className="p-6 text-slate-500">Cargando…</p>
  if (documento.isError) return <p className="p-6 text-red-700">{mensajeError(documento.error)}</p>

  const d = documento.data
  // Origen y destino tomados de la primera línea (todas comparten ubicación)
  const origen = d.detalle_documento[0]?.origen?.nombre
  const destino = d.detalle_documento[0]?.destino?.nombre

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-sm print:p-0">
      {/* Botones: no salen en la impresión */}
      <div className="mb-6 flex gap-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-slate-900 px-4 py-2 text-white"
        >
          Imprimir / Guardar PDF
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-md border border-slate-300 px-4 py-2"
        >
          Cerrar
        </button>
      </div>

      {/* Encabezado */}
      <header className="flex items-start justify-between border-b border-slate-300 pb-4">
        <div>
          <h1 className="text-xl font-bold">Pisos Buruca</h1>
          <p className="text-slate-600">San Miguel, El Salvador</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">{NOMBRE_TIPO_DOCUMENTO[d.tipo]}</p>
          <p className="font-mono text-base">{d.numero}</p>
          <p className="text-slate-600">{new Date(d.fecha).toLocaleString('es-SV')}</p>
          {d.estado === 'anulado' && <p className="font-bold text-red-700">ANULADO</p>}
        </div>
      </header>

      {/* Datos generales */}
      <section className="grid grid-cols-2 gap-x-8 gap-y-1 py-4">
        {d.numero_comprobante && (
          <p>
            <span className="text-slate-500">
              {d.tipo_comprobante === 'factura' ? 'Factura' : 'Recibo'}:
            </span>{' '}
            {d.numero_comprobante}
          </p>
        )}
        {origen && (
          <p>
            <span className="text-slate-500">Sale de:</span> {origen}
          </p>
        )}
        {destino && (
          <p>
            <span className="text-slate-500">Entra a:</span> {destino}
          </p>
        )}
        {d.retira_nombre && (
          <p>
            <span className="text-slate-500">Retira:</span> {d.retira_nombre}
          </p>
        )}
        {d.retira_placa && (
          <p>
            <span className="text-slate-500">Placa:</span> {d.retira_placa}
          </p>
        )}
        <p>
          <span className="text-slate-500">Registró:</span> {d.creador?.nombre ?? '—'}
        </p>
        {d.motivo && (
          <p className="col-span-2">
            <span className="text-slate-500">Observaciones:</span> {d.motivo}
          </p>
        )}
      </section>

      {/* Productos */}
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-y border-slate-400">
            <th className="py-2">Código</th>
            <th className="py-2">Producto</th>
            <th className="py-2 text-right">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {d.detalle_documento.map((l, i) => (
            <tr key={i} className="border-b border-slate-200">
              <td className="py-2 font-mono text-xs">{l.productos.codigo}</td>
              <td className="py-2">{l.productos.nombre}</td>
              <td className="py-2 text-right">{formatearStock(l.productos, l.cantidad)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Firmas */}
      <section className="mt-20 grid grid-cols-2 gap-16 text-center">
        <div className="border-t border-slate-500 pt-2">Entregó (bodega)</div>
        <div className="border-t border-slate-500 pt-2">Recibió (nombre y firma)</div>
      </section>
    </div>
  )
}
