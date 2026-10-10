/**
 * ImprimirOrden.tsx
 * Documento impreso de un movimiento (orden de salida, traslado, entrada,
 * merma…) listo para imprimir o guardar en PDF (RF-31).
 * Lleva logo y datos de la empresa (src/lib/empresa.ts), los datos propios
 * de cada tipo de documento, la tabla de productos y las firmas.
 * Las salidas y traslados salen con ORIGINAL y COPIA (una por hoja).
 * Se abre en una pestaña aparte, sin menú y siempre en modo claro.
 */
import { useState } from 'react'
import { useParams } from 'react-router'
import { useSesion } from '@/auth/contexto'
import { NOMBRE_TIPO_DOCUMENTO } from '@/lib/documentos'
import { EMPRESA, LOGO_DOCUMENTOS, lineasEmpresa } from '@/lib/empresa'
import { formatearFechaHora } from '@/lib/fechas'
import { mensajeError } from '@/lib/supabase'
import { formatearStock } from '@/lib/unidades'
import { useDocumentoImprimible, type DocumentoImprimible } from './api'
import { copiasImpresas, firmasImpresas, tituloImpreso } from './formatoOrden'

/**
 * ImprimirOrden: lee el id de la dirección (/imprimir/:id), carga el
 * documento y muestra la barra de botones y las copias a imprimir.
 */
export function ImprimirOrden() {
  const { id } = useParams()
  const documento = useDocumentoImprimible(Number(id))
  const { perfil } = useSesion()

  // Fecha y hora de impresión (se toma una vez al abrir)
  const [impreso] = useState(() => new Date().toLocaleString('es-SV'))
  // Si se imprime también la copia (solo aplica a documentos con copia)
  const [conCopia, setConCopia] = useState(true)

  if (documento.isPending) return <p className="p-6 text-slate-500">Cargando…</p>
  if (documento.isError) return <p className="p-6 text-red-700">{mensajeError(documento.error)}</p>

  const d = documento.data
  const copias = copiasImpresas(d.tipo)
  const aImprimir = conCopia ? copias : copias.slice(0, 1)

  return (
    <div className="min-h-dvh bg-slate-100 py-6 text-slate-900 print:bg-white print:py-0">
      {/* Barra de botones: no sale en la impresión */}
      <div className="mx-auto mb-4 flex max-w-[8.5in] flex-wrap items-center gap-3 px-4 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-marca-rojo px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-marca-rojo-oscuro"
        >
          Imprimir / Guardar PDF
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Cerrar
        </button>
        {copias.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={conCopia}
              onChange={(e) => setConCopia(e.target.checked)}
            />
            Incluir copia ({copias[1]})
          </label>
        )}
      </div>

      {/* Una hoja por copia */}
      {aImprimir.map((etiqueta, i) => (
        <HojaDocumento
          key={etiqueta}
          documento={d}
          etiqueta={etiqueta}
          impreso={impreso}
          usuario={perfil?.nombre ?? ''}
          ultima={i === aImprimir.length - 1}
        />
      ))}
    </div>
  )
}

/** Propiedades de una hoja impresa. */
interface PropsHoja {
  documento: DocumentoImprimible
  etiqueta: string // "Original · Cliente", "Copia · Bodega"…
  impreso: string // fecha y hora de impresión
  usuario: string // quien imprime
  ultima: boolean // la última hoja no lleva salto de página
}

/**
 * HojaDocumento: dibuja una hoja tamaño carta con encabezado de la empresa,
 * datos del documento, productos, firmas y pie.
 */
function HojaDocumento({ documento: d, etiqueta, impreso, usuario, ultima }: PropsHoja) {
  // Origen y destino tomados de la primera línea (todas comparten ubicación)
  const origen = d.detalle_documento[0]?.origen?.nombre
  const destino = d.detalle_documento[0]?.destino?.nombre
  const anulado = d.estado === 'anulado'
  const firmas = firmasImpresas(d.tipo)

  // Datos del documento: solo los que tienen valor
  const datos: [string, string | null | undefined][] = [
    [d.tipo_comprobante === 'factura' ? 'Factura' : 'Recibo', d.numero_comprobante],
    ['Proveedor', d.proveedores?.nombre],
    ['Documento del proveedor', d.documento_proveedor],
    ['Sale de', origen],
    ['Entra a', destino],
    ['Retira', d.retira_nombre],
    ['Placa del vehículo', d.retira_placa],
    ['Registró', d.creador?.nombre],
    ['Aprobó', d.aprobador?.nombre],
  ]
  const visibles = datos.filter(([, valor]) => Boolean(valor))

  return (
    <article
      className={`relative mx-auto max-w-[8.5in] bg-white p-10 text-sm shadow-md print:max-w-none print:p-0 print:shadow-none ${
        ultima ? '' : 'mb-6 break-after-page print:mb-0'
      }`}
    >
      {/* Marca de agua si el documento está anulado */}
      {anulado && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-30 text-8xl font-black tracking-widest text-slate-400/20">
            ANULADO
          </span>
        </div>
      )}

      {/* ---------- Encabezado: empresa y recuadro del documento ---------- */}
      <header className="flex items-start justify-between gap-6 border-b border-slate-300 pb-5">
        <div className="flex items-start gap-4">
          <img src={LOGO_DOCUMENTOS} alt={EMPRESA.nombre} className="h-20 w-auto" />
          <div className="space-y-0.5">
            <p className="text-xl font-bold tracking-wide text-slate-900">
              {EMPRESA.nombre.toUpperCase()}
            </p>
            {lineasEmpresa().map((linea) => (
              <p key={linea} className="text-xs text-slate-600">
                {linea}
              </p>
            ))}
            {EMPRESA.direccionBodega && (
              <p className="text-xs text-slate-600">Bodega: {EMPRESA.direccionBodega}</p>
            )}
          </div>
        </div>

        <div className="w-60 shrink-0 overflow-hidden rounded-lg border border-slate-300 text-center">
          <p className="border-b border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-bold tracking-wider text-slate-800 uppercase">
            {tituloImpreso(d.tipo)}
          </p>
          <div className="space-y-0.5 px-3 py-2">
            <p className="font-mono text-lg font-bold">{d.numero}</p>
            <p className="text-xs text-slate-600">{NOMBRE_TIPO_DOCUMENTO[d.tipo]}</p>
            <p className="text-xs text-slate-600">{formatearFechaHora(d.fecha)}</p>
          </div>
          <p className="border-t border-slate-300 bg-slate-50 px-3 py-1 text-[11px] font-semibold tracking-wide text-slate-700 uppercase">
            {etiqueta}
          </p>
        </div>
      </header>

      {/* Aviso de anulación */}
      {anulado && (
        <p className="mt-4 rounded-md border border-slate-400 bg-slate-50 px-3 py-2 text-slate-800">
          <strong>Documento ANULADO.</strong> {d.motivo_anulacion ?? ''}
        </p>
      )}

      {/* ---------- Datos del documento ---------- */}
      {visibles.length > 0 && (
        <section className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-slate-200 p-4">
          {visibles.map(([etiquetaDato, valor]) => (
            <div key={etiquetaDato}>
              <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                {etiquetaDato}
              </p>
              <p className="font-medium">{valor}</p>
            </div>
          ))}
        </section>
      )}

      {/* ---------- Productos ---------- */}
      <table className="mt-5 w-full border-collapse text-left">
        <thead>
          <tr className="border-y border-slate-400 bg-slate-100 text-xs tracking-wide text-slate-700 uppercase">
            <th className="w-10 px-3 py-2 text-center">#</th>
            <th className="px-3 py-2">Código</th>
            <th className="px-3 py-2">Producto</th>
            <th className="px-3 py-2 text-right">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {d.detalle_documento.map((l, i) => (
            <tr key={i} className="border-b border-slate-200 even:bg-slate-50">
              <td className="px-3 py-2 text-center text-slate-500">{i + 1}</td>
              <td className="px-3 py-2 font-mono text-xs">{l.productos.codigo}</td>
              <td className="px-3 py-2">{l.productos.nombre}</td>
              <td className="px-3 py-2 text-right font-medium">
                {formatearStock(l.productos, l.cantidad)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-400">
            <td colSpan={4} className="px-3 py-2 text-right text-xs text-slate-600">
              Total de productos: <strong>{d.detalle_documento.length}</strong>
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Observaciones o motivo */}
      {d.motivo && (
        <section className="mt-4 rounded-lg border border-slate-200 p-3">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            Observaciones
          </p>
          <p>{d.motivo}</p>
        </section>
      )}

      {/* ---------- Firmas ---------- */}
      <section
        className={`mt-20 grid gap-10 text-center text-xs ${
          firmas.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
        }`}
      >
        {firmas.map((firma) => (
          <div key={firma} className="border-t border-slate-500 pt-2">
            <p className="font-medium">{firma}</p>
            <p className="mt-1 text-slate-500">Nombre, firma y fecha</p>
          </div>
        ))}
      </section>

      {/* ---------- Pie ---------- */}
      <footer className="mt-10 flex justify-between border-t border-slate-200 pt-2 text-[10px] text-slate-400">
        <span>Sistema de control de inventario · {EMPRESA.nombre}</span>
        <span>
          Impreso el {impreso}
          {usuario ? ` por ${usuario}` : ''}
        </span>
      </footer>
    </article>
  )
}
