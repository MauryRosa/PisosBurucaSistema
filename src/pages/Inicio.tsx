/**
 * Inicio.tsx
 * Pantalla de bienvenida después de iniciar sesión.
 */
import { useSesion } from '@/auth/contexto'
import { NOMBRE_ROL } from '@/lib/roles'

/**
 * Inicio: saluda al usuario y muestra su rol.
 */
export function Inicio() {
  const { perfil } = useSesion()

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">Bienvenido, {perfil?.nombre}</h1>
      <p className="text-slate-600">
        Rol: {perfil ? NOMBRE_ROL[perfil.rol] : ''}. Use el menú para entrar a cada módulo.
      </p>
    </section>
  )
}
