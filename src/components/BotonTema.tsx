import { useState } from 'react'
import { Icono } from '@/components/Icono'
import { aplicarTema, temaActual, temaContrario } from '@/lib/tema'

/**
 * Botón para cambiar entre modo claro y modo oscuro.
 * Muestra la luna en modo claro (para pasar a oscuro) y el sol en modo
 * oscuro (para volver a claro). La preferencia queda guardada.
 */
export function BotonTema() {
  // Tema actual, leído de <html> al montar el botón
  const [tema, setTema] = useState(temaActual)

  /** Cambia al tema contrario, lo aplica a la página y lo guarda. */
  function cambiarTema() {
    const nuevo = temaContrario(tema)
    aplicarTema(nuevo)
    setTema(nuevo)
  }

  const oscuro = tema === 'oscuro'

  return (
    <button
      type="button"
      onClick={cambiarTema}
      title={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
    >
      <Icono nombre={oscuro ? 'sol' : 'luna'} className="size-[18px]" />
    </button>
  )
}
