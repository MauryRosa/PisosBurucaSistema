/**
 * evidencias.ts
 * Subida y consulta de archivos de evidencia (cartas de merma, fotos de entrega)
 * en el bucket privado "evidencias" de Supabase Storage.
 */
import { supabase } from '@/lib/supabase'

/** Nombre del bucket en Supabase Storage. */
const BUCKET = 'evidencias'

/** Tipos de archivo permitidos (deben coincidir con la migración 05). */
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

/** Tamaño máximo: 5 MB. */
const TAMANO_MAXIMO = 5 * 1024 * 1024

/**
 * subirEvidencia: valida y sube un archivo al bucket.
 * Lo guarda como "AÑO/identificador-único.extensión" para que nunca se repita.
 * @param archivo Archivo elegido por el usuario.
 * @returns Ruta del archivo dentro del bucket (se guarda en documentos.evidencia_url).
 */
export async function subirEvidencia(archivo: File): Promise<string> {
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    throw new Error('Solo se permiten fotos (JPG, PNG, WEBP) o PDF')
  }
  if (archivo.size > TAMANO_MAXIMO) {
    throw new Error('El archivo no puede pesar más de 5 MB')
  }

  const extension = archivo.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const ruta = `${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, archivo, { contentType: archivo.type })
  if (error) throw error
  return ruta
}

/**
 * abrirEvidencia: abre un archivo privado en una pestaña nueva usando un
 * enlace temporal que vence en 5 minutos.
 * La pestaña se abre primero (antes de esperar a Supabase) para que el
 * navegador no la bloquee como ventana emergente.
 * @param ruta Ruta del archivo dentro del bucket.
 */
export async function abrirEvidencia(ruta: string) {
  const ventana = window.open('', '_blank')
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, 300)
  if (error || !ventana) {
    ventana?.close()
    throw error ?? new Error('El navegador bloqueó la ventana')
  }
  ventana.location.href = data.signedUrl
}
