/**
 * HistorialDocumentos.tsx
 * Tabla de los últimos documentos de ciertos tipos (entradas, salidas…).
 * Muestra número, fecha, tipo, referencia, productos, quién lo registró y estado.
 */
import {
  NOMBRE_TIPO_DOCUMENTO,
  useDocumentos,
  type DocumentoResumen,
  type TipoDocumento,
} from '@/lib/documentos'
import { mensajeError } from '@/lib/supabase'
import { formatearStock } from '@/lib/unidades'
import { claseCelda, claseEncabezado, claseTabla } from './estilos'

interface Props {
  tipos: TipoDocumento[] // tipos de documento a mostrar
  titulo: string // título de la sección
}

/**
 * referencia: dato principal que identifica el documento
 * (factura/recibo, documento del proveedor o motivo).
 */
function referencia(d: DocumentoResumen): string {
  if (d.numero_comprobante) {
    return `${d.tipo_comprobante === 'factura' ? 'Factura' : 'Recibo'} ${d.numero_comprobante}`
  }
  if (d.documento_proveedor) {
    return `${d.proveedores?.nombre ?? 'Proveedor'} · Doc. ${d.documento_proveedor}`
  }
  return d.motivo ?? '—'
}

/** Color del estado del documento. */
const COLOR_ESTADO: Record<DocumentoResumen['estado'], string> = {
  aprobado: 'text-green-700',
  pendiente: 'text-amber-700',
  anulado: 'text-red-700 line-through',
}

/**
 * HistorialDocumentos: consulta y dibuja la tabla.
 */
export function HistorialDocumentos({ tipos, titulo }: Props) {
  const documentos = useDocumentos(tipos)

  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{titulo}</h2>

      {documentos.isPending && <p className="text-slate-500">Cargando…</p>}
      {documentos.isError && <p className="text-red-700">{mensajeError(documentos.error)}</p>}

      {documentos.isSuccess && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className={claseTabla}>
            <thead className={claseEncabezado}>
              <tr>
                <th className={claseCelda}>Número</th>
                <th className={claseCelda}>Fecha</th>
                <th className={claseCelda}>Tipo</th>
                <th className={claseCelda}>Referencia</th>
                <th className={claseCelda}>Productos</th>
                <th className={claseCelda}>Registró</th>
                <th className={claseCelda}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {documentos.data.map((d) => (
                <tr key={d.id} className="border-t border-slate-100 align-top">
                  <td className={`${claseCelda} font-mono text-xs whitespace-nowrap`}>
                    {d.numero}
                  </td>
                  <td className={`${claseCelda} whitespace-nowrap`}>
                    {new Date(d.fecha).toLocaleString('es-SV')}
                  </td>
                  <td className={claseCelda}>{NOMBRE_TIPO_DOCUMENTO[d.tipo]}</td>
                  <td className={claseCelda}>{referencia(d)}</td>
                  <td className={claseCelda}>
                    {d.detalle_documento.map((l, i) => (
                      <div key={i}>
                        {l.productos.nombre}:{' '}
                        <span className="text-slate-600">
                          {formatearStock(l.productos, l.cantidad)}
                        </span>
                      </div>
                    ))}
                  </td>
                  <td className={claseCelda}>{d.creador?.nombre ?? '—'}</td>
                  <td className={`${claseCelda} capitalize ${COLOR_ESTADO[d.estado]}`}>
                    {d.estado}
                  </td>
                </tr>
              ))}
              {documentos.data.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                    Todavía no hay documentos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
