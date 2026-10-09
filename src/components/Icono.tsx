import { TRAZOS, type NombreIcono } from '@/lib/iconos'

/** Propiedades del ícono: nombre y clases opcionales (tamaño, color). */
type Props = {
  nombre: NombreIcono
  className?: string
}

/**
 * Dibuja un ícono de línea en SVG.
 * Toma el color del texto (currentColor), así que se pinta con clases
 * como "text-marca-rojo". Por defecto mide 20x20 px (size-5).
 */
export function Icono({ nombre, className = 'size-5' }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {TRAZOS[nombre].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
