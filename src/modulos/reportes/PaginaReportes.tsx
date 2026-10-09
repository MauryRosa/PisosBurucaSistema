/**
 * PaginaReportes.tsx
 * Pantalla de reportes con cuatro pestañas (RF-38, RF-39).
 * Solo jefe de bodega y administrador.
 */
import { useState } from 'react'
import { ReporteBajoMinimo } from './ReporteBajoMinimo'
import { ReporteKardex } from './ReporteKardex'
import { ReporteMovimientos } from './ReporteMovimientos'
import { ReporteSalidas } from './ReporteSalidas'

// Pestañas disponibles
const PESTANAS = [
  { id: 'salidas', titulo: 'Salidas (cuadre)' },
  { id: 'movimientos', titulo: 'Movimientos' },
  { id: 'kardex', titulo: 'Kardex' },
  { id: 'minimo', titulo: 'Bajo mínimo' },
] as const

type IdPestana = (typeof PESTANAS)[number]['id']

/**
 * PaginaReportes: encabezado, pestañas y el reporte elegido.
 */
export function PaginaReportes() {
  const [pestana, setPestana] = useState<IdPestana>('salidas')

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Reportes</h1>
        <p className="text-sm text-slate-500">Todos los reportes se pueden exportar a Excel.</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPestana(p.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${
              pestana === p.id
                ? 'border-slate-900 font-medium text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {p.titulo}
          </button>
        ))}
      </div>

      {pestana === 'salidas' && <ReporteSalidas />}
      {pestana === 'movimientos' && <ReporteMovimientos />}
      {pestana === 'kardex' && <ReporteKardex />}
      {pestana === 'minimo' && <ReporteBajoMinimo />}
    </section>
  )
}
