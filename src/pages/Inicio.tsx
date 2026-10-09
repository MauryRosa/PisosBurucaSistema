import { useState } from 'react'
import { Link } from 'react-router'
import { useSesion } from '@/auth/contexto'
import { Icono } from '@/components/Icono'
import { NOMBRE_ROL } from '@/lib/roles'
import { ESTILO_COLOR, accesosDeRol, puedeEntrar, type Acceso } from '@/modulos/inicio/accesos'
import { useBajoMinimo } from '@/modulos/inicio/api'
import {
  ESTILO_NIVEL,
  nivelAlerta,
  textoCantidad,
  type ProductoBajoMinimo,
} from '@/modulos/inicio/bajoMinimo'
import { fechaLarga, primerNombre, saludoSegunHora } from '@/modulos/inicio/saludo'

/** Cuántos productos bajo mínimo se muestran en el dashboard (el resto, en Reportes). */
const MAXIMO_VISIBLE = 8

/**
 * Página de Inicio: dashboard de la aplicación.
 * - Encabezado con saludo, fecha, rol y el logo de la empresa.
 * - Tarjetas de acceso rápido según el rol.
 * - Panel de productos bajo stock mínimo.
 */
export function Inicio() {
  const { perfil } = useSesion()

  // Saludo y fecha se calculan una sola vez al abrir la página
  const [saludo] = useState(saludoSegunHora)
  const [hoy] = useState(fechaLarga)

  if (!perfil) return null

  const accesos = accesosDeRol(perfil.rol)

  return (
    <div className="space-y-6">
      {/* ---------- Encabezado con logo ---------- */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Franja con los colores de la marca */}
        <div className="absolute inset-x-0 top-0 flex h-1.5">
          <span className="flex-1 bg-marca-verde" />
          <span className="flex-1 bg-marca-rojo" />
        </div>

        <div className="flex flex-col-reverse items-start gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{hoy}</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {saludo}, {primerNombre(perfil.nombre)}
            </h1>
            <p className="max-w-xl text-slate-600 dark:text-slate-400">
              Control de inventario de bodega principal y minibodega de sala de ventas.
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <span className="size-1.5 rounded-full bg-marca-verde" />
              {NOMBRE_ROL[perfil.rol]}
            </span>
          </div>

          <img
            src="/logo-pisos-buruca.png"
            alt="Pisos Buruca"
            className="h-24 w-auto shrink-0 drop-shadow-sm sm:h-32"
          />
        </div>
      </section>

      {/* ---------- Accesos rápidos ---------- */}
      <section aria-labelledby="titulo-accesos" className="space-y-3">
        <h2
          id="titulo-accesos"
          className="text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400"
        >
          Accesos rápidos
        </h2>
        <div className={`grid gap-4 sm:grid-cols-2 ${accesos.length > 2 ? 'xl:grid-cols-4' : ''}`}>
          {accesos.map((acceso) => (
            <TarjetaAcceso key={acceso.ruta} acceso={acceso} />
          ))}
        </div>
      </section>

      {/* ---------- Productos bajo stock mínimo ---------- */}
      <PanelBajoMinimo verReporte={puedeEntrar(perfil.rol, '/reportes')} />
    </div>
  )
}

/**
 * Tarjeta de acceso rápido: ícono de color, título, descripción y
 * flecha. Toda la tarjeta es un enlace al módulo.
 */
function TarjetaAcceso({ acceso }: { acceso: Acceso }) {
  const estilo = ESTILO_COLOR[acceso.color]

  return (
    <Link
      to={acceso.ruta}
      className={`group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-marca-rojo focus-visible:outline-none dark:border-slate-800 dark:bg-slate-900 ${estilo.borde}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex size-11 items-center justify-center rounded-xl ${estilo.icono}`}
        >
          <Icono nombre={acceso.icono} className="size-6" />
        </span>
        <Icono
          nombre="flecha"
          className="size-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300"
        />
      </div>
      <div>
        <h3 className="font-semibold">{acceso.titulo}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{acceso.descripcion}</p>
      </div>
    </Link>
  )
}

/**
 * Panel con los productos cuyo disponible (todas las ubicaciones)
 * está por debajo de su stock mínimo. Muestra los más críticos primero.
 * verReporte: si el usuario puede abrir Reportes, se muestra el enlace.
 */
function PanelBajoMinimo({ verReporte }: { verReporte: boolean }) {
  const { data: productos = [], isPending, error } = useBajoMinimo()
  const visibles = productos.slice(0, MAXIMO_VISIBLE)
  const ocultos = productos.length - visibles.length

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Encabezado del panel */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 items-center justify-center rounded-lg bg-marca-rojo-claro text-marca-rojo dark:bg-marca-rojo/15 dark:text-red-400">
            <Icono nombre="alerta" />
          </span>
          <div>
            <h2 className="font-semibold">Productos bajo stock mínimo</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Disponible sumando bodega principal y minibodega
            </p>
          </div>
          {productos.length > 0 && (
            <span className="rounded-full bg-marca-rojo px-2.5 py-0.5 text-xs font-bold text-white">
              {productos.length}
            </span>
          )}
        </div>
        {verReporte && (
          <Link
            to="/reportes"
            className="text-sm font-medium text-marca-rojo hover:underline dark:text-red-400"
          >
            Ver reporte completo
          </Link>
        )}
      </header>

      {/* Contenido: cargando, error, todo en orden o la lista */}
      {isPending ? (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {[1, 2, 3].map((n) => (
            <li key={n} className="px-5 py-4">
              <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-2 h-2 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            </li>
          ))}
        </ul>
      ) : error ? (
        <p className="px-5 py-6 text-sm text-marca-rojo dark:text-red-400">
          No se pudo cargar la lista. Revise la conexión e intente de nuevo.
        </p>
      ) : productos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-marca-verde-claro text-marca-verde dark:bg-marca-verde/15 dark:text-green-400">
            <Icono nombre="check" className="size-6" />
          </span>
          <p className="font-medium">Todo en orden</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ningún producto está por debajo de su stock mínimo.
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {visibles.map((producto) => (
              <FilaBajoMinimo key={producto.producto_id} producto={producto} />
            ))}
          </ul>
          {ocultos > 0 && (
            <p className="border-t border-slate-200 px-5 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Y {ocultos} producto{ocultos === 1 ? '' : 's'} más
              {verReporte ? ' en el reporte completo.' : '.'}
            </p>
          )}
        </>
      )}
    </section>
  )
}

/**
 * Una fila del panel: producto, nivel de alerta, barra de avance hacia
 * el mínimo y las cantidades (disponible, mínimo y faltante).
 */
function FilaBajoMinimo({ producto }: { producto: ProductoBajoMinimo }) {
  const nivel = ESTILO_NIVEL[nivelAlerta(producto)]

  return (
    <li className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center md:gap-6">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{producto.nombre}</span>
          <span className="font-mono text-xs text-slate-400">{producto.codigo}</span>
          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${nivel.etiqueta}`}>
            {nivel.texto}
          </span>
        </div>
        {/* Barra: qué tanto del mínimo hay disponible */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full ${nivel.barra}`}
            style={{ width: `${Math.max(producto.porcentaje, 2)}%` }}
          />
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-4 text-sm md:w-[26rem]">
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Disponible</dt>
          <dd className="font-medium">
            {textoCantidad(producto.disponible, producto.piezas_por_caja)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Mínimo</dt>
          <dd>{textoCantidad(producto.stock_minimo, producto.piezas_por_caja)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Faltan</dt>
          <dd className="font-semibold text-marca-rojo dark:text-red-400">
            {textoCantidad(producto.faltante, producto.piezas_por_caja)}
          </dd>
        </div>
      </dl>
    </li>
  )
}
