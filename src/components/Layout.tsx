import { useState, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useSesion } from '@/auth/contexto'
import { BotonTema } from '@/components/BotonTema'
import { Icono } from '@/components/Icono'
import { iconoDeRuta } from '@/lib/iconos'
import { MENU, NOMBRE_ROL } from '@/lib/roles'

/**
 * Estructura general de la aplicación (después de iniciar sesión):
 * - Menú lateral con el logo, las opciones del rol y el usuario.
 * - En celular el menú se abre y se cierra con el botón "Menú".
 * - Botón de modo claro / oscuro.
 * Muestra la página actual con <Outlet /> (o con children, si se le pasan).
 */
export function Layout({ children }: { children?: ReactNode }) {
  const { perfil, cerrarSesion } = useSesion()

  // En celular: si el menú lateral está abierto
  const [menuAbierto, setMenuAbierto] = useState(false)

  // Opciones del menú que puede ver el rol del usuario
  const opciones = perfil ? MENU.filter((opcion) => opcion.roles.includes(perfil.rol)) : []

  /** Cierra el menú en celular (al elegir una opción o tocar fuera). */
  function cerrarMenu() {
    setMenuAbierto(false)
  }

  return (
    <div className="min-h-dvh lg:flex">
      {/* ---------- Barra superior (solo celular y tablet) ---------- */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/90">
        <Marca />
        <div className="flex items-center gap-2">
          <BotonTema />
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            <Icono nombre="menu" />
          </button>
        </div>
      </header>

      {/* Fondo oscuro detrás del menú abierto en celular */}
      {menuAbierto && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={cerrarMenu}
          aria-hidden="true"
        />
      )}

      {/* ---------- Menú lateral ---------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 dark:border-slate-800 dark:bg-slate-900 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo y botón de cerrar (celular) */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <Marca />
          <button
            type="button"
            onClick={cerrarMenu}
            aria-label="Cerrar menú"
            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
          >
            <Icono nombre="cerrar" />
          </button>
        </div>

        {/* Opciones del menú */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {opciones.map((opcion) => (
            <NavLink
              key={opcion.ruta}
              to={opcion.ruta}
              onClick={cerrarMenu}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-marca-rojo-claro text-marca-rojo-oscuro dark:bg-marca-rojo/15 dark:text-red-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Indicador rojo a la izquierda de la opción activa */}
                  {isActive && (
                    <span className="absolute inset-y-1.5 left-0 w-1 rounded-r bg-marca-rojo" />
                  )}
                  <Icono nombre={iconoDeRuta(opcion.ruta)} className="size-[18px] shrink-0" />
                  {opcion.titulo}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Usuario, tema y cerrar sesión */}
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-marca-verde text-sm font-bold text-white">
              {perfil?.nombre?.trim().charAt(0).toUpperCase() ?? '?'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{perfil?.nombre}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {perfil ? NOMBRE_ROL[perfil.rol] : ''}
              </p>
            </div>
            <span className="hidden lg:block">
              <BotonTema />
            </span>
          </div>
          <button
            type="button"
            onClick={() => void cerrarSesion()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-marca-rojo/50 hover:bg-marca-rojo-claro hover:text-marca-rojo-oscuro dark:border-slate-700 dark:text-slate-300 dark:hover:bg-marca-rojo/15 dark:hover:text-red-300"
          >
            <Icono nombre="salir" className="size-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ---------- Contenido de la página ---------- */}
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-7xl">{children ?? <Outlet />}</div>
      </main>
    </div>
  )
}

/** Logo pequeño (diamantes) con el nombre del sistema. */
function Marca() {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/isotipo-pisos-buruca.png" alt="" className="h-8 w-auto" />
      <div className="leading-tight">
        <p className="text-sm font-extrabold tracking-wide text-marca-rojo">PISOS BURUCA</p>
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Control de inventario
        </p>
      </div>
    </div>
  )
}
