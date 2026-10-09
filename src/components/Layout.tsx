/**
 * Layout.tsx
 * Estructura común de todas las pantallas: menú lateral (filtrado por rol),
 * datos del usuario y botón de cerrar sesión. En celular el menú se abre con un botón.
 */
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useSesion } from '@/auth/contexto'
import { MENU, NOMBRE_ROL } from '@/lib/roles'

/**
 * Layout: dibuja el menú y, a la derecha, la pantalla activa (<Outlet />).
 */
export function Layout() {
  const { perfil, cerrarSesion } = useSesion()
  const [menuAbierto, setMenuAbierto] = useState(false) // menú en celular

  // Solo las opciones que el rol del usuario puede ver
  const opciones = MENU.filter((o) => perfil && o.roles.includes(perfil.rol))

  return (
    <div className="min-h-screen md:flex">
      {/* Barra superior: solo en celular */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <span className="font-semibold">Inventario · Pisos Buruca</span>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-1 text-sm"
          onClick={() => setMenuAbierto((v) => !v)}
        >
          Menú
        </button>
      </header>

      {/* Menú lateral */}
      <aside
        className={`${menuAbierto ? 'block' : 'hidden'} w-full border-r border-slate-200 bg-white md:block md:min-h-screen md:w-64`}
      >
        <div className="hidden px-5 py-5 md:block">
          <p className="text-lg font-semibold">Pisos Buruca</p>
          <p className="text-sm text-slate-500">Control de inventario</p>
        </div>

        <nav className="flex flex-col gap-1 px-3 pb-4">
          {opciones.map((o) => (
            <NavLink
              key={o.ruta}
              to={o.ruta}
              onClick={() => setMenuAbierto(false)}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm ${isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`
              }
            >
              {o.titulo}
            </NavLink>
          ))}
        </nav>

        {/* Usuario conectado */}
        <div className="border-t border-slate-200 px-5 py-4 text-sm">
          <p className="font-medium">{perfil?.nombre}</p>
          <p className="text-slate-500">{perfil ? NOMBRE_ROL[perfil.rol] : ''}</p>
          <button
            type="button"
            onClick={cerrarSesion}
            className="mt-2 text-slate-600 underline hover:text-slate-900"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Pantalla activa */}
      <main className="flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}
