/**
 * App.tsx
 * Componente principal de la aplicación.
 * Por ahora solo muestra una pantalla de bienvenida para comprobar que
 * React y Tailwind funcionan. En los siguientes pasos aquí irán las rutas
 * (login, consulta de stock, salidas, etc.).
 */

/**
 * App: pantalla temporal de bienvenida.
 * @returns Tarjeta centrada con el nombre del sistema.
 */
function App() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">Pisos Buruca</h1>
        <p className="mt-1 text-slate-500">Sistema de Control de Inventario</p>
        <p className="mt-4 text-sm text-green-700">React + TypeScript + Tailwind funcionando</p>
      </div>
    </main>
  )
}

export default App
