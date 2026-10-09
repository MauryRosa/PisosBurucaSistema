/**
 * PaginaCatalogo.tsx
 * Pantalla del módulo Catálogo con tres pestañas:
 * Productos, Proveedores y Ubicaciones. Solo la ve el administrador.
 */
import { useState } from 'react'
import { SeccionProductos } from './SeccionProductos'
import { SeccionProveedores } from './SeccionProveedores'
import { SeccionUbicaciones } from './SeccionUbicaciones'

// Pestañas disponibles
const PESTANAS = [
  { id: 'productos', titulo: 'Productos' },
  { id: 'proveedores', titulo: 'Proveedores' },
  { id: 'ubicaciones', titulo: 'Ubicaciones' },
] as const

type IdPestana = (typeof PESTANAS)[number]['id']

/**
 * PaginaCatalogo: encabezado, pestañas y la sección elegida.
 */
export function PaginaCatalogo() {
  const [pestana, setPestana] = useState<IdPestana>('productos') // pestaña activa

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Catálogo</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Productos, proveedores y ubicaciones. Nada se borra: se desactiva para conservar el
          historial.
        </p>
      </div>

      {/* Pestañas */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPestana(p.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${
              pestana === p.id
                ? 'border-marca-rojo font-medium text-marca-rojo-oscuro dark:text-red-300'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            {p.titulo}
          </button>
        ))}
      </div>

      {/* Sección activa */}
      {pestana === 'productos' && <SeccionProductos />}
      {pestana === 'proveedores' && <SeccionProveedores />}
      {pestana === 'ubicaciones' && <SeccionUbicaciones />}
    </section>
  )
}
