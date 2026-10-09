/**
 * ProveedorSesion.tsx
 * Envuelve toda la aplicación y mantiene actualizada la sesión:
 * detecta cuando el usuario entra o sale y carga su perfil (nombre y rol).
 */
import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Perfil } from '@/types'
import { ContextoSesion } from './contexto'

/**
 * ProveedorSesion: guarda la sesión de Supabase y el perfil del usuario,
 * y los comparte con todas las pantallas a través del contexto.
 */
export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null) // sesión actual
  const [iniciando, setIniciando] = useState(true) // revisando sesión guardada

  // Al abrir la app: recuperar la sesión guardada y escuchar entradas/salidas
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setIniciando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => setSesion(nueva))
    // Al cerrar la app, dejar de escuchar
    return () => data.subscription.unsubscribe()
  }, [])

  const usuarioId = sesion?.user.id

  // Cargar el perfil (nombre y rol) del usuario conectado
  const perfil = useQuery({
    queryKey: ['perfil', usuarioId],
    enabled: Boolean(usuarioId), // solo si hay sesión
    queryFn: async (): Promise<Perfil> => {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', usuarioId!)
        .single()
      if (error) throw error
      return data as Perfil
    },
  })

  const valor = {
    sesion,
    perfil: perfil.data ?? null,
    cargando: iniciando || (Boolean(usuarioId) && perfil.isPending),
    /** cerrarSesion: termina la sesión en Supabase (vuelve al login). */
    cerrarSesion: async () => {
      await supabase.auth.signOut()
    },
  }

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}
