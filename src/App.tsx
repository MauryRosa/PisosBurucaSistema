/**
 * App.tsx
 * Componente principal. TEMPORAL (Paso 3): prueba que la aplicación
 * se conecta con Supabase. En el Paso 4 se reemplaza por el login.
 */
import { useEffect, useState } from 'react'
import { supabase, mensajeError } from '@/lib/supabase'

/**
 * App: muestra si la conexión con Supabase funciona.
 * Consulta la tabla "ubicaciones". Sin sesión iniciada, la seguridad (RLS)
 * devuelve 0 filas: eso es CORRECTO y confirma que la conexión y la seguridad funcionan.
 */
function App() {
  // Texto del resultado de la prueba
  const [estado, setEstado] = useState('Probando conexión…')

  // Se ejecuta una sola vez al abrir la página
  useEffect(() => {
    /** probarConexion: hace una consulta simple y guarda el resultado en pantalla. */
    async function probarConexion() {
      const { data, error } = await supabase.from('ubicaciones').select('id')
      if (error) {
        setEstado(`Error: ${mensajeError(error)}`)
      } else {
        setEstado(`Conexión OK · filas visibles sin sesión: ${data.length} (debe ser 0)`)
      }
    }
    probarConexion()
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">Pisos Buruca</h1>
        <p className="mt-1 text-slate-500">Sistema de Control de Inventario</p>
        <p className="mt-4 text-sm">{estado}</p>
      </div>
    </main>
  )
}

export default App
