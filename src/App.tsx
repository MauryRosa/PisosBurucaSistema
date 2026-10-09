/**
 * App.tsx
 * Define las rutas (direcciones) de la aplicación y qué pantalla muestra cada una.
 * Todas las rutas, excepto /login, están protegidas por sesión y por rol.
 */
import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { RutaProtegida } from '@/auth/RutaProtegida'
import { Layout } from '@/components/Layout'
import { MENU } from '@/lib/roles'
import { Inicio } from '@/pages/Inicio'
import { Login } from '@/pages/Login'
import { Pendiente } from '@/pages/Pendiente'
import { PaginaCatalogo } from '@/modulos/catalogo/PaginaCatalogo'
import { PaginaStock } from '@/modulos/stock/PaginaStock'
import { PaginaEntradas } from '@/modulos/entradas/PaginaEntradas'
import { PaginaReservas } from '@/modulos/reservas/PaginaReservas'
import { ImprimirOrden } from '@/modulos/salidas/ImprimirOrden'
import { PaginaSalidas } from '@/modulos/salidas/PaginaSalidas'
import { PaginaTraslados } from '@/modulos/traslados/PaginaTraslados'
import { PaginaMovimientos } from '@/modulos/movimientos/PaginaMovimientos'
import { PaginaConteos } from '@/modulos/conteos/PaginaConteos'
import { PaginaReportes } from '@/modulos/reportes/PaginaReportes'
import { PaginaPedidos } from '@/modulos/pedidos/PaginaPedidos'

// Pantallas ya construidas. Al terminar un módulo, se agrega aquí su ruta.
const PANTALLAS: Record<string, ReactNode> = {
  '/inicio': <Inicio />,
  '/stock': <PaginaStock />,
  '/salidas': <PaginaSalidas />,
  '/reservas': <PaginaReservas />,
  '/entradas': <PaginaEntradas />,
  '/catalogo': <PaginaCatalogo />,
  '/traslados': <PaginaTraslados />,
  '/movimientos': <PaginaMovimientos />,
  '/conteos': <PaginaConteos />,
  '/reportes': <PaginaReportes />,
  '/pedidos': <PaginaPedidos />,
}

/**
 * App: arma todas las rutas a partir del MENU.
 * Los módulos sin pantalla todavía muestran <Pendiente>.
 */
function App() {
  return (
    <Routes>
      {/* Pública */}
      <Route path="/login" element={<Login />} />

      {/* Protegidas: requieren sesión y usan el Layout con menú */}
      <Route
        element={
          <RutaProtegida>
            <Layout />
          </RutaProtegida>
        }
      >
        <Route index element={<Navigate to="/inicio" replace />} />
        {MENU.map((opcion) => (
          <Route
            key={opcion.ruta}
            path={opcion.ruta}
            element={
              <RutaProtegida roles={opcion.roles}>
                {PANTALLAS[opcion.ruta] ?? <Pendiente opcion={opcion} />}
              </RutaProtegida>
            }
          />
        ))}
      </Route>

      {/* Impresión de órdenes: sin menú (fuera del Layout), solo bodega y administración */}
      <Route
        path="/imprimir/:id"
        element={
          <RutaProtegida roles={['administrador', 'jefe_bodega']}>
            <ImprimirOrden />
          </RutaProtegida>
        }
      />

      {/* Cualquier otra dirección → inicio (siempre al final) */}
      <Route path="*" element={<Navigate to="/inicio" replace />} />
    </Routes>
  )
}

export default App
