/**
 * PaginaMovimientos.tsx
 * Pantalla "Mermas y otros": formulario de movimientos, pendientes de
 * aprobación, anulación de documentos (solo administrador) e historial.
 */
import { useSesion } from '@/auth/contexto'
import { HistorialDocumentos } from '@/components/HistorialDocumentos'
import { FormularioMovimiento } from './FormularioMovimiento'
import { TIPOS_MOVIMIENTO } from './tipos'
import { PanelAnulacion } from './PanelAnulacion'
import { PanelPendientes } from './PanelPendientes'

/**
 * PaginaMovimientos: arma las secciones según el rol del usuario.
 */
export function PaginaMovimientos() {
  const { perfil } = useSesion()
  const esAdmin = perfil?.rol === 'administrador'

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mermas y otros movimientos</h1>
        <p className="text-sm text-slate-500">
          Mermas, consumo interno, exhibición, devoluciones a proveedor y cambios o garantías.
        </p>
      </div>

      <FormularioMovimiento />
      <PanelPendientes esAdmin={esAdmin} />
      {esAdmin && <PanelAnulacion />}
      <HistorialDocumentos tipos={[...TIPOS_MOVIMIENTO]} titulo="Últimos movimientos" imprimible />
    </section>
  )
}
