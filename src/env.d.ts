/**
 * env.d.ts
 * Le dice a TypeScript qué variables de entorno existen (las del archivo .env.local).
 * Vite solo expone al navegador las variables que empiezan con "VITE_".
 */
interface ImportMetaEnv {
  /** URL del proyecto Supabase */
  readonly VITE_SUPABASE_URL: string
  /** Clave pública (publishable/anon) de Supabase */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
