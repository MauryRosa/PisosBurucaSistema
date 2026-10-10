/**
 * Pendiente.tsx
 * Pantalla temporal para los módulos que todavía no se construyen.
 */
import type { OpcionMenu } from '@/lib/roles'

/**
 * Pendiente: muestra el nombre del módulo y sus requerimientos.
 * @param opcion Opción del menú a la que pertenece esta pantalla.
 */
export function Pendiente({ opcion }: { opcion: OpcionMenu }) {
  return (
    <section className="max-w-2xl space-y-2">
      <h1 className="text-2xl font-semibold">{opcion.titulo}</h1>
      <p className="text-slate-600 dark:text-slate-400">{opcion.descripcion}</p>
      <p className="rounded-md border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm text-slate-500 dark:text-slate-400">
        Módulo pendiente de construir · {opcion.requerimientos}
      </p>
    </section>
  )
}
