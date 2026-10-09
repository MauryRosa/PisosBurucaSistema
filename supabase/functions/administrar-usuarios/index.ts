// @ts-nocheck -- Este archivo corre en Deno (Edge Function de Supabase), no en el navegador.
// VS Code no reconoce "Deno" ni los imports "npm:", pero Supabase sí. Se revisa al publicarlo.

/**
 * administrar-usuarios (Supabase Edge Function)
 * Administración de usuarios del sistema (RF-40). Corre en los servidores de
 * Supabase porque necesita la clave secreta, que NUNCA debe ir en el navegador.
 *
 * Solo la puede usar un ADMINISTRADOR activo. Acciones (campo "accion"):
 *   listar             → correos y último acceso de todos los usuarios
 *   crear              → { email, password, nombre, rol }
 *   cambiar_contrasena → { id, password }
 *   activar/desactivar → { id }  (desactivar bloquea el inicio de sesión)
 */
import { createClient } from 'npm:@supabase/supabase-js@2'

// Permisos para que el navegador pueda llamar a la función (CORS)
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Roles válidos (deben coincidir con el tipo rol_usuario de la base de datos)
const ROLES = ['administrador', 'jefe_bodega', 'vendedora']

/**
 * responder: arma una respuesta JSON con los permisos CORS.
 */
function responder(cuerpo: unknown, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

/**
 * claveSecreta: obtiene la clave secreta del proyecto.
 * Usa las claves nuevas de Supabase (SUPABASE_SECRET_KEYS) y, si no existen,
 * la clave anterior (SUPABASE_SERVICE_ROLE_KEY).
 */
function claveSecreta(): string {
  const nuevas = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (nuevas) {
    try {
      const claves = JSON.parse(nuevas) as Record<string, string>
      if (claves.default) return claves.default
    } catch {
      // Si no se puede leer, se usa la clave anterior
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
}

Deno.serve(async (req) => {
  // El navegador primero pregunta si puede llamar (CORS)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // Cliente con permisos totales (solo dentro de esta función)
    const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', claveSecreta(), {
      auth: { persistSession: false },
    })

    // 1. ¿Quién está llamando? Se valida su sesión con el token que envía
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const {
      data: { user },
      error: errorSesion,
    } = await admin.auth.getUser(token)
    if (errorSesion || !user) return responder({ error: 'Sesión no válida' }, 401)

    // 2. Solo un administrador activo puede continuar
    const { data: perfil } = await admin
      .from('perfiles')
      .select('rol, activo')
      .eq('id', user.id)
      .single()
    if (!perfil?.activo || perfil.rol !== 'administrador') {
      return responder({ error: 'Solo el administrador puede administrar usuarios' }, 403)
    }

    // 3. Ejecutar la acción pedida
    const cuerpo = await req.json()

    switch (cuerpo.accion) {
      // Lista de correos y último acceso
      case 'listar': {
        const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
        if (error) throw error
        return responder(
          data.users.map((u) => ({
            id: u.id,
            email: u.email ?? null,
            ultimo_acceso: u.last_sign_in_at ?? null,
          })),
        )
      }

      // Crear usuario ya confirmado, con su nombre y rol
      case 'crear': {
        const { email, password, nombre, rol } = cuerpo
        if (!email || !nombre || !ROLES.includes(rol) || !password || password.length < 8) {
          return responder(
            { error: 'Escriba correo, nombre, rol y una contraseña de 8 caracteres o más' },
            400,
          )
        }
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // ya confirmado: puede entrar de inmediato
          user_metadata: { nombre },
        })
        if (error) return responder({ error: error.message }, 400)

        // El trigger crea el perfil como "vendedora"; aquí se le pone el rol elegido
        const { error: errorPerfil } = await admin
          .from('perfiles')
          .update({ nombre, rol })
          .eq('id', data.user.id)
        if (errorPerfil) throw errorPerfil
        return responder({ id: data.user.id })
      }

      // Cambiar la contraseña de un usuario
      case 'cambiar_contrasena': {
        const { id, password } = cuerpo
        if (!id || !password || password.length < 8) {
          return responder({ error: 'La contraseña debe tener 8 caracteres o más' }, 400)
        }
        const { error } = await admin.auth.admin.updateUserById(id, { password })
        if (error) return responder({ error: error.message }, 400)
        return responder({ ok: true })
      }

      // Activar o desactivar (bloquea el inicio de sesión y marca el perfil)
      case 'activar':
      case 'desactivar': {
        if (cuerpo.id === user.id) {
          return responder({ error: 'No puede desactivarse a sí mismo' }, 400)
        }
        const activo = cuerpo.accion === 'activar'
        const { error } = await admin.auth.admin.updateUserById(cuerpo.id, {
          ban_duration: activo ? 'none' : '876000h', // 876000 h ≈ 100 años
        })
        if (error) return responder({ error: error.message }, 400)
        await admin.from('perfiles').update({ activo }).eq('id', cuerpo.id)
        return responder({ ok: true })
      }

      default:
        return responder({ error: 'Acción no válida' }, 400)
    }
  } catch (e) {
    return responder({ error: e instanceof Error ? e.message : 'Error inesperado' }, 500)
  }
})
