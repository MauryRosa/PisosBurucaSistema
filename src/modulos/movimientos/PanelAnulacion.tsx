/**
 * PanelAnulacion.tsx
 * Anulación de documentos por el administrador (RF-25).
 * Se busca por número (ej. VEN-2026-00001); al anular, el documento no se borra:
 * queda "anulado" con su motivo, el stock se revierte y las reservas
 * que había consumido vuelven a quedar activas.
 */
import { useState } from 'react'
import { Campo } from '@/components/Campo'
import { claseBoton, claseBotonSecundario, claseInput } from '@/components/estilos'
import { NOMBRE_TIPO_DOCUMENTO } from '@/lib/documentos'
import { mensajeError } from '@/lib/supabase'
import { formatearStock } from '@/lib/unidades'
import { buscarDocumentoPorNumero, useAnularDocumento, type DocumentoRevision } from './api'

/**
 * PanelAnulacion: buscador por número + resumen del documento + anulación.
 */
export function PanelAnulacion() {
  const anular = useAnularDocumento()
  const [numero, setNumero] = useState('') // número a buscar
  const [documento, setDocumento] = useState<DocumentoRevision | null>(null)
  const [motivo, setMotivo] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  /** buscar: trae el documento con ese número. */
  const buscar = async () => {
    setMensaje(null)
    setDocumento(null)
    if (!numero.trim()) return
    setBuscando(true)
    try {
      const encontrado = await buscarDocumentoPorNumero(numero)
      if (!encontrado) setMensaje({ tipo: 'error', texto: 'No existe un documento con ese número' })
      setDocumento(encontrado)
    } catch (e) {
      setMensaje({ tipo: 'error', texto: mensajeError(e) })
    } finally {
      setBuscando(false)
    }
  }

  /** confirmarAnulacion: anula el documento encontrado con el motivo escrito. */
  const confirmarAnulacion = async () => {
    if (!documento) return
    if (!motivo.trim()) {
      return setMensaje({ tipo: 'error', texto: 'Escriba el motivo de la anulación' })
    }
    try {
      await anular.mutateAsync({ id: documento.id, motivo: motivo.trim() })
      setMensaje({ tipo: 'ok', texto: `Documento ${documento.numero} anulado.` })
      setDocumento(null)
      setMotivo('')
      setNumero('')
    } catch (e) {
      setMensaje({ tipo: 'error', texto: mensajeError(e) })
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <h2 className="font-semibold">Anular documento</h2>
        <p className="text-sm text-slate-500">
          El documento no se borra: queda anulado con su motivo y el stock se revierte.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Campo etiqueta="Número de documento">
          <input
            placeholder="VEN-2026-00001"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            className={claseInput}
          />
        </Campo>
        <button type="button" onClick={buscar} disabled={buscando} className={claseBotonSecundario}>
          {buscando ? 'Buscando…' : 'Buscar'}
        </button>
      </div>

      {/* Resumen del documento encontrado */}
      {documento && (
        <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <p>
            <span className="font-mono font-medium">{documento.numero}</span> ·{' '}
            {NOMBRE_TIPO_DOCUMENTO[documento.tipo]} ·{' '}
            {new Date(documento.fecha).toLocaleString('es-SV')} · Estado:{' '}
            <span className="font-medium capitalize">{documento.estado}</span>
          </p>
          {documento.numero_comprobante && (
            <p>
              {documento.tipo_comprobante === 'factura' ? 'Factura' : 'Recibo'}{' '}
              {documento.numero_comprobante}
            </p>
          )}
          <ul className="list-inside list-disc">
            {documento.detalle_documento.map((l, i) => (
              <li key={i}>
                {l.productos.nombre}: {formatearStock(l.productos, l.cantidad)}
              </li>
            ))}
          </ul>

          {documento.estado === 'anulado' ? (
            <p className="text-red-700">Este documento ya está anulado.</p>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Campo etiqueta="Motivo de la anulación">
                <input
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className={claseInput}
                />
              </Campo>
              <button
                type="button"
                onClick={confirmarAnulacion}
                disabled={anular.isPending}
                className={claseBoton}
              >
                Anular documento
              </button>
            </div>
          )}
        </div>
      )}

      {mensaje && (
        <p className={`text-sm ${mensaje.tipo === 'ok' ? 'text-green-700' : 'text-red-700'}`}>
          {mensaje.texto}
        </p>
      )}
    </section>
  )
}
