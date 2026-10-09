/**
 * main.tsx
 * Punto de entrada del frontend. Monta la aplicación y sus "proveedores":
 *  - QueryClientProvider: consultas a la base de datos con memoria (React Query)
 *  - BrowserRouter: navegación entre pantallas
 *  - ProveedorSesion: sesión y perfil del usuario
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProveedorSesion } from '@/auth/ProveedorSesion'
import App from './App'
import './index.css'

// Configuración de consultas: los datos se consideran frescos 30 s; 1 reintento si falla
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ProveedorSesion>
          <App />
        </ProveedorSesion>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
