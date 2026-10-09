/**
 * DetalleConteo.tsx
 * Pantalla de un conteo: progreso, búsqueda, captura por producto y
 * botones para cerrar (generar ajuste) o cancelar.
 */
import { useState } from 'react'
import {
  claseBoton,
  claseBotonSecundario,
  claseCelda,
  claseEncabezado,
  claseInput,
  claseTabla,
} from '@/components/estilos'
import { mensajeError } from '@/lib/supabase'
import { useCancelarConteo, useCerrarConteo, useLineasConteo } from './api'
import { FilaConteo } from './FilaConteo'
import type { Conteo } from './tipos'

interface Props {
  conteo: Conteo
  onVolver: () => void // regresar a la lista de conteos
}

/**
 * DetalleConteo: muestra y permite capturar las líneas de un conteo.
 */
export function DetalleConteo({ conteo, onVolver }: Props) {
  const lineas = useLineasConteo(conteo.id)
  const cerrar = useCerrarConteo()
  const cancelar = useCancelarConteo()

  const [busqueda, setBusqueda] = useState('')
  const [soloPendientes, setSoloPendientes] = useState(false)
  const [confirmando, setConfirmando] = useState<'cerrar' | 'cancelar' | null>(null)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const editable = conteo.estado === 'abierto'
  const todas = lineas.data ?? []
  const contadas = todas.filter((l) => l.cantidad_contada !== null).length
  const conDiferencia = todas.filter((l) => (l.diferencia ?? 0) !== 0).length

  // Líneas visibles según búsqueda y filtro
  const texto = busqueda.trim().toLowerCase()
  const visibles = todas.filter(
    (l) =>
      (!soloPendientes || l.cantidad_contada === null) &&
      (!texto ||
        l.productos.codigo.toLowerCase().includes(texto) ||
        l.productos.nombre.toLowerCase().includes(texto)),
  )

  /** cerrarConteo: cierra y avisa si se generó un ajuste. */
  const cerrarConteo = async () => {
    setMensaje(null)
    try {
      const ajusteId = await cerrar.mutateAsync(conteo.id)
      setMensaje({
        tipo: 'ok',
        texto: ajusteId
          ? 'Conteo cerrado. Se generó un ajuste que queda pendiente de aprobación en "Mermas y otros".'
          : 'Conteo cerrado sin diferencias. No se generó ajuste.',
      })
    } catch (e) {
      setMensaje({ tipo: 'error', texto: mensajeError(e) })
    } finally {
      setConfirmando(null)
    }
  }

  /** cancelarConteo: cancela sin generar ajuste. */
  const cancelarConteo = async () => {
    setMensaje(null)
    try {
      await cancelar.mutateAsync(conteo.id)
      onVolver()
    } catch (e) {
      setMensaje({ tipo: 'error', texto: mensajeError(e) })
      setConfirmando(null)
    }
  }

  return (
    <section className="space-y-4">
      <button type="button" onClick={onVolver} className={claseBotonSecundario}>
        ← Volver a conteos
      </button>

      {/* Encabezado y progreso */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-sm">
        <h2 className="text-lg font-semibold">
          Conteo #{conteo.id} · {conteo.ubicaciones.nombre} ·{' '}
          {conteo.categoria ?? 'Todos los productos'}
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Estado: <span className="font-medium capitalize">{conteo.estado}</span> · Contados{' '}
          {contadas} de {todas.length} · Con diferencia: {conDiferencia}
          {conteo.ajuste && ` · Ajuste ${conteo.ajuste.numero} (${conteo.ajuste.estado})`}
        </p>
        {editable && (
          <p className="mt-1 text-amber-700 dark:text-amber-400">
            No registre movimientos en esta ubicación mientras el conteo esté abierto.
          </p>
        )}
      </div>

      {/* Búsqueda y filtro */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder="Buscar producto"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className={`${claseInput} sm:max-w-md`}
        />
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={soloPendientes}
            onChange={(e) => setSoloPendientes(e.target.checked)}
          />
          Solo pendientes de contar
        </label>
      </div>

      {lineas.isPending && <p className="text-slate-500 dark:text-slate-400">Cargando…</p>}
      {lineas.isError && (
        <p className="text-red-700 dark:text-red-400">{mensajeError(lineas.error)}</p>
      )}

      {lineas.isSuccess && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className={claseTabla}>
            <thead className={claseEncabezado}>
              <tr>
                <th className={claseCelda}>Producto</th>
                <th className={claseCelda}>Sistema</th>
                <th className={claseCelda}>Contado</th>
                <th className={claseCelda}>Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((l) => (
                <FilaConteo
                  key={`${l.id}-${l.cantidad_contada}`}
                  linea={l}
                  conteoId={conteo.id}
                  editable={editable}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mensaje && (
        <p
          className={`text-sm ${mensaje.tipo === 'ok' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}
        >
          {mensaje.texto}
        </p>
      )}

      {/* Acciones: con confirmación */}
      {editable && (
        <div className="flex flex-wrap gap-2">
          {confirmando === null && (
            <>
              <button type="button" onClick={() => setConfirmando('cerrar')} className={claseBoton}>
                Cerrar conteo y generar ajuste
              </button>
              <button
                type="button"
                onClick={() => setConfirmando('cancelar')}
                className={claseBotonSecundario}
              >
                Cancelar conteo
              </button>
            </>
          )}
          {confirmando === 'cerrar' && (
            <>
              <span className="self-center text-sm">¿Cerrar el conteo? Ya no se podrá editar.</span>
              <button
                type="button"
                onClick={cerrarConteo}
                disabled={cerrar.isPending}
                className={claseBoton}
              >
                Sí, cerrar
              </button>
              <button
                type="button"
                onClick={() => setConfirmando(null)}
                className={claseBotonSecundario}
              >
                No
              </button>
            </>
          )}
          {confirmando === 'cancelar' && (
            <>
              <span className="self-center text-sm">
                ¿Cancelar el conteo? No se generará ajuste.
              </span>
              <button
                type="button"
                onClick={cancelarConteo}
                disabled={cancelar.isPending}
                className={claseBoton}
              >
                Sí, cancelar
              </button>
              <button
                type="button"
                onClick={() => setConfirmando(null)}
                className={claseBotonSecundario}
              >
                No
              </button>
            </>
          )}
        </div>
      )}
    </section>
  )
}
