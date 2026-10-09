/**
 * PanelPendientes.tsx
 * Documentos que esperan aprobación de gerencia (mermas y ajustes) · RF-20.
 * El administrador puede adjuntar la carta firmada, aprobar o rechazar.
 * El jefe de bodega solo los ve (para saber qué falta aprobar).
 */
import { useState } from 'react'
import { claseBoton, claseBotonSecundario, claseBotonTabla, claseInput } from '@/components/estilos'
import { NOMBRE_TIPO_DOCUMENTO } from '@/lib/documentos'
import { abrirEvidencia, subirEvidencia } from '@/lib/evidencias'
import { mensajeError } from '@/lib/supabase'
import { formatearStock } from '@/lib/unidades'
import {
  useAnularDocumento,
  useAprobarDocumento,
  usePendientes,
  type DocumentoRevision,
} from './api'

interface PropsFila {
  documento: DocumentoRevision
  esAdmin: boolean // solo el administrador ve los botones
}

/**
 * FilaPendiente: tarjeta de un documento pendiente con sus acciones.
 */
function FilaPendiente({ documento: d, esAdmin }: PropsFila) {
  const aprobar = useAprobarDocumento()
  const anular = useAnularDocumento()
  const [archivo, setArchivo] = useState<File | null>(null) // carta firmada
  const [rechazando, setRechazando] = useState(false) // mostrar campo de motivo
  const [motivo, setMotivo] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** aprobarDocumento: sube la carta (si se eligió) y aprueba; el stock se descuenta. */
  const aprobarDocumento = async () => {
    setError(null)
    setTrabajando(true)
    try {
      const evidencia = archivo ? await subirEvidencia(archivo) : undefined
      await aprobar.mutateAsync({ id: d.id, evidencia })
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setTrabajando(false)
    }
  }

  /** rechazar: anula el documento pendiente con motivo; el stock no cambia. */
  const rechazar = async () => {
    setError(null)
    if (!motivo.trim()) return setError('Escriba el motivo del rechazo')
    setTrabajando(true)
    try {
      await anular.mutateAsync({ id: d.id, motivo: motivo.trim() })
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setTrabajando(false)
    }
  }

  /** verEvidencia: abre la carta o foto ya adjunta. */
  const verEvidencia = async () => {
    if (!d.evidencia_url) return
    try {
      await abrirEvidencia(d.evidencia_url)
    } catch (e) {
      setError(mensajeError(e))
    }
  }

  return (
    <li className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p>
          <span className="font-mono font-medium">{d.numero}</span> ·{' '}
          {NOMBRE_TIPO_DOCUMENTO[d.tipo]} · {new Date(d.fecha).toLocaleString('es-SV')} · Registró:{' '}
          {d.creador?.nombre ?? '—'}
        </p>
        {d.evidencia_url && (
          <button type="button" className={claseBotonTabla} onClick={verEvidencia}>
            Ver carta / evidencia
          </button>
        )}
      </div>

      <p>
        <span className="text-slate-500">Motivo:</span> {d.motivo ?? '—'}
      </p>
      <ul className="list-inside list-disc">
        {d.detalle_documento.map((l, i) => (
          <li key={i}>
            {l.productos.nombre}: {formatearStock(l.productos, l.cantidad)}
          </li>
        ))}
      </ul>

      {esAdmin && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <button
            type="button"
            onClick={aprobarDocumento}
            disabled={trabajando}
            className={claseBoton}
          >
            Aprobar
          </button>
          {!rechazando ? (
            <button
              type="button"
              onClick={() => setRechazando(true)}
              className={claseBotonSecundario}
            >
              Rechazar
            </button>
          ) : (
            <>
              <input
                placeholder="Motivo del rechazo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className={`${claseInput} mt-0 max-w-xs`}
              />
              <button
                type="button"
                onClick={rechazar}
                disabled={trabajando}
                className={claseBotonSecundario}
              >
                Confirmar rechazo
              </button>
            </>
          )}
        </div>
      )}

      {error && <p className="text-red-700">{error}</p>}
    </li>
  )
}

/**
 * PanelPendientes: lista de documentos pendientes de aprobación.
 */
export function PanelPendientes({ esAdmin }: { esAdmin: boolean }) {
  const pendientes = usePendientes()

  return (
    <section className="space-y-2">
      <h2 className="font-semibold">Pendientes de aprobación</h2>
      {pendientes.isPending && <p className="text-slate-500">Cargando…</p>}
      {pendientes.isError && <p className="text-red-700">{mensajeError(pendientes.error)}</p>}
      {pendientes.isSuccess && pendientes.data.length === 0 && (
        <p className="text-sm text-slate-500">No hay documentos pendientes.</p>
      )}
      {pendientes.isSuccess && pendientes.data.length > 0 && (
        <ul className="space-y-2">
          {pendientes.data.map((d) => (
            <FilaPendiente key={d.id} documento={d} esAdmin={esAdmin} />
          ))}
        </ul>
      )}
    </section>
  )
}
