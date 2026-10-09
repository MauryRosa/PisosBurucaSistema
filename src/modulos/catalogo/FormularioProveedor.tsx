/**
 * FormularioProveedor.tsx
 * Formulario para crear o editar un proveedor.
 */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Campo } from '@/components/Campo'
import { claseBoton, claseBotonSecundario, claseInput } from '@/components/estilos'
import { mensajeError } from '@/lib/supabase'
import { useGuardarProveedor } from './api'
import { esquemaProveedor, type DatosProveedor, type Proveedor } from './tipos'

interface Props {
  proveedor: Proveedor | null // null = proveedor nuevo
  alTerminar: () => void // se llama al guardar o cancelar
}

/**
 * FormularioProveedor: muestra los campos, valida y guarda en Supabase.
 */
export function FormularioProveedor({ proveedor, alTerminar }: Props) {
  const guardar = useGuardarProveedor()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatosProveedor>({
    resolver: zodResolver(esquemaProveedor),
    // Si se edita, el formulario arranca con los datos actuales
    defaultValues: {
      nombre: proveedor?.nombre ?? '',
      contacto: proveedor?.contacto ?? '',
      telefono: proveedor?.telefono ?? '',
    },
  })

  /** enviar: guarda el proveedor y cierra el formulario si todo salió bien. */
  const enviar = async (datos: DatosProveedor) => {
    setError(null)
    try {
      await guardar.mutateAsync({ id: proveedor?.id, datos })
      alTerminar()
    } catch (e) {
      setError(mensajeError(e))
    }
  }

  return (
    <form
      onSubmit={handleSubmit(enviar)}
      className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
    >
      <h2 className="font-semibold">{proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo etiqueta="Nombre" error={errors.nombre?.message}>
          <input {...register('nombre')} className={claseInput} />
        </Campo>
        <Campo etiqueta="Contacto" error={errors.contacto?.message}>
          <input {...register('contacto')} className={claseInput} />
        </Campo>
        <Campo etiqueta="Teléfono" error={errors.telefono?.message}>
          <input {...register('telefono')} className={claseInput} />
        </Campo>
      </div>

      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={isSubmitting} className={claseBoton}>
          {isSubmitting ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" onClick={alTerminar} className={claseBotonSecundario}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
