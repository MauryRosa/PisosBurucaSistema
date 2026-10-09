/**
 * eslint.config.js
 * Reglas de calidad de código (ESLint). Detecta errores y malas prácticas.
 * "prettier" va al final para desactivar las reglas de formato que maneja Prettier.
 */
import prettier from 'eslint-config-prettier'
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // No revisar la carpeta "dist" (código compilado, no lo escribimos nosotros)
  globalIgnores(['dist']),
  {
    // Aplicar estas reglas a todos los archivos TypeScript y React
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended, // Reglas básicas de JavaScript
      tseslint.configs.recommended, // Reglas para TypeScript
      reactHooks.configs.flat.recommended, // Uso correcto de hooks (useState, useEffect…)
      reactRefresh.configs.vite, // Compatibilidad con la recarga rápida de Vite
      prettier, // SIEMPRE al final: apaga reglas que chocan con Prettier
    ],
    languageOptions: {
      // Variables globales del navegador (window, document…)
      globals: globals.browser,
    },
  },
])
