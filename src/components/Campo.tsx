/**
 * Campo.tsx
 * Envoltura de un campo de formulario: etiqueta arriba, control en medio
 * y mensaje de error abajo (en rojo) si la validación falla.
 */
import type { ReactNode } from 'react'

interface Props {
  etiqueta: string // texto que ve el usuario
  error?: string // mensaje de error de validación
  ayuda?: string // texto de ayuda opcional (gris)
  children: ReactNode // el input o select
}

/**
 * Campo: dibuja la etiqueta, el control y su error o ayuda.
 */
export function Campo({ etiqueta, error, ayuda, children }: Props) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{etiqueta}</span>
      {children}
      {ayuda && !error && <span className="text-xs text-slate-500">{ayuda}</span>}
      {error && <span className="text-xs text-red-700">{error}</span>}
    </label>
  )
}
