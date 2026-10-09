/**
 * FiltroFechas.tsx
 * Dos campos de fecha (desde / hasta) para los reportes.
 */
import { Campo } from '@/components/Campo'
import { claseInput } from '@/components/estilos'

interface Props {
  desde: string // "AAAA-MM-DD"
  hasta: string
  onDesde: (valor: string) => void
  onHasta: (valor: string) => void
}

/**
 * FiltroFechas: selector de rango de fechas.
 */
export function FiltroFechas({ desde, hasta, onDesde, onHasta }: Props) {
  return (
    <>
      <Campo etiqueta="Desde">
        <input
          type="date"
          value={desde}
          max={hasta}
          onChange={(e) => onDesde(e.target.value)}
          className={claseInput}
        />
      </Campo>
      <Campo etiqueta="Hasta">
        <input
          type="date"
          value={hasta}
          min={desde}
          onChange={(e) => onHasta(e.target.value)}
          className={claseInput}
        />
      </Campo>
    </>
  )
}
