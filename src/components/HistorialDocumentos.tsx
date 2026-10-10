/**
 * HistorialDocumentos.tsx
 * Tabla de los últimos documentos de ciertos tipos (entradas, salidas…).
 * Muestra número, fecha, tipo, referencia, productos, quién lo registró y estado.
 * Opcionalmente muestra un enlace para imprimir cada documento.
 */
import {
  NOMBRE_TIPO_DOCUMENTO,
  useDocumentos,
  type DocumentoResumen,
  type TipoDocumento,
} from '@/lib/documentos'
import { mensajeError } from '@/lib/supabase'
import { formatearStock } from '@/lib/unidades'
import { claseBotonTabla, claseCelda, claseEncabezado, claseTabla } from './estilos'
import { abrirImpresion } from '@/lib/impresion'

interface Props {
  tipos: TipoDocumento[] // tipos de documento a mostrar
  titulo: string // título de la sección
  imprimible?: boolean // true = mostrar columna "Imprimir"
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
  aprobado: 'text-green-700 dark:text-green-400',
  pendiente: 'text-amber-700 dark:text-amber-400',
  anulado: 'text-red-700 dark:text-red-400 line-through',
}

/**
 * HistorialDocumentos: consulta y dibuja la tabla.
 */
export function HistorialDocumentos({ tipos, titulo, imprimible = false }: Props) {
  const documentos = useDocumentos(tipos)
  const columnas = imprimible ? 8 : 7

  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{titulo}</h2>

      {documentos.isPending && <p className="text-slate-500 dark:text-slate-400">Cargando…</p>}
      {documentos.isError && (
        <p className="text-red-700 dark:text-red-400">{mensajeError(documentos.error)}</p>
      )}

      {documentos.isSuccess && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
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
                {imprimible && <th className={claseCelda}></th>}
              </tr>
            </thead>
            <tbody>
              {documentos.data.map((d) => (
                <tr
                  key={d.id}
                  className="border-t border-slate-100 dark:border-slate-800 align-top"
                >
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
                        <span className="text-slate-600 dark:text-slate-400">
                          {formatearStock(l.productos, l.cantidad)}
                        </span>
                      </div>
                    ))}
                  </td>
                  <td className={claseCelda}>{d.creador?.nombre ?? '—'}</td>
                  <td className={`${claseCelda} capitalize ${COLOR_ESTADO[d.estado]}`}>
                    {d.estado}
                  </td>
                  {imprimible && (
                    <td className={claseCelda}>
                      <button
                        type="button"
                        className={claseBotonTabla}
                        onClick={() => abrirImpresion(d.id)}
                      >
                        Imprimir
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {documentos.data.length === 0 && (
                <tr>
                  <td
                    colSpan={columnas}
                    className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                  >
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
