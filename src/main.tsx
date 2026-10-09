/**
 * main.tsx
 * Punto de entrada del frontend: monta la aplicación React dentro del
 * <div id="root"> que está en index.html.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// StrictMode: en desarrollo avisa de errores comunes; no afecta la versión publicada
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
