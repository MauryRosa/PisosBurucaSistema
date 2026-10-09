/**
 * api.ts (módulo Usuarios)
 * Usuarios (perfiles + datos de acceso por la Edge Function) y bitácora.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { finDelDia, inicioDelDia } from '@/lib/fechas'
import { supabase } from '@/lib/supabase'
import type { Rol } from '@/types'
import type { RegistroBitacora, UsuarioSistema } from './tipos'

/**
 * llamarFuncion: llama a la Edge Function "administrar-usuarios".
 * Si la función responde con error, lanza su mensaje (en español).
 */
async function llamarFuncion<T>(cuerpo: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('administrar-usuarios', {
    body: cuerpo,
  })
  if (error) {
    // El mensaje real viene dentro de la respuesta de la función
    const respuesta = (error as { context?: Response }).context
    if (respuesta && typeof respuesta.json === 'function') {
      const detalle = (await respuesta.json().catch(() => null)) as { error?: string } | null
      if (detalle?.error) throw new Error(detalle.error)
    }
    throw error
  }
  return data as T
}

/**
 * useUsuarios: perfiles de la base de datos combinados con el correo
 * y el último acceso (que solo la Edge Function puede leer).
 */
export function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: async (): Promise<UsuarioSistema[]> => {
      const [perfiles, accesos] = await Promise.all([
        supabase.from('perfiles').select('id, nombre, rol, activo, creado_en').order('nombre'),
        llamarFuncion<{ id: string; email: string | null; ultimo_acceso: string | null }[]>({
          accion: 'listar',
        }),
      ])
      if (perfiles.error) throw perfiles.error

      // Unir por id
      const porId = new Map(accesos.map((a) => [a.id, a]))
      return (perfiles.data as Omit<UsuarioSistema, 'email' | 'ultimo_acceso'>[]).map((p) => ({
        ...p,
        email: porId.get(p.id)?.email ?? null,
        ultimo_acceso: porId.get(p.id)?.ultimo_acceso ?? null,
      }))
    },
  })
}

/** useCrearUsuario: crea un usuario con su rol (Edge Function). */
export function useCrearUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datos: { email: string; password: string; nombre: string; rol: Rol }) =>
      llamarFuncion<{ id: string }>({ accion: 'crear', ...datos }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}

/** useActualizarPerfil: cambia nombre y rol (directo en la tabla perfiles; RLS: solo admin). */
export function useActualizarPerfil() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, nombre, rol }: { id: string; nombre: string; rol: Rol }) => {
      const { error } = await supabase.from('perfiles').update({ nombre, rol }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      queryClient.invalidateQueries({ queryKey: ['vendedoras'] })
    },
  })
}

/** useAccionUsuario: activar, desactivar o cambiar contraseña (Edge Function). */
export function useAccionUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datos: {
      accion: 'activar' | 'desactivar' | 'cambiar_contrasena'
      id: string
      password?: string
    }) => llamarFuncion<{ ok: boolean }>(datos),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}

/** usePerfilesNombres: id → nombre de todos los usuarios (para la bitácora). */
export function usePerfilesNombres() {
  return useQuery({
    queryKey: ['perfiles-nombres'],
    queryFn: async (): Promise<Map<string, string>> => {
      const { data, error } = await supabase.from('perfiles').select('id, nombre')
      if (error) throw error
      return new Map((data as { id: string; nombre: string }[]).map((p) => [p.id, p.nombre]))
    },
  })
}

/**
 * useBitacora: últimos 300 registros de la bitácora en un periodo,
 * opcionalmente de una sola tabla.
 */
export function useBitacora(desde: string, hasta: string, tabla: string) {
  return useQuery({
    queryKey: ['bitacora', desde, hasta, tabla],
    queryFn: async (): Promise<RegistroBitacora[]> => {
      let consulta = supabase
        .from('bitacora')
        .select('*')
        .gte('fecha', inicioDelDia(desde))
        .lte('fecha', finDelDia(hasta))
        .order('fecha', { ascending: false })
        .limit(300)
      if (tabla !== 'todas') consulta = consulta.eq('tabla', tabla)
      const { data, error } = await consulta
      if (error) throw error
      return data as RegistroBitacora[]
    },
  })
}
