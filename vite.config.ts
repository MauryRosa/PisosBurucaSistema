/**
 * vite.config.ts
 * Configuración de Vite, la herramienta que levanta el servidor de desarrollo
 * y compila la aplicación para publicarla.
 */
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Plugins: soporte para React (JSX, recarga rápida) y para Tailwind CSS
  plugins: [react(), tailwindcss()],

  resolve: {
    // Alias "@": permite importar con '@/lib/archivo' en lugar de '../../lib/archivo'
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
