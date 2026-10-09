/**
 * FormularioProducto.tsx
 * Formulario para crear o editar un producto (RF-01 a RF-04).
 * Cambia los campos según el tipo: los pisos piden piezas por caja y medida;
 * los accesorios solo su unidad (bolsa, unidad, galón…).
 */
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Campo } from '@/components/Campo'
import { claseBoton, claseBotonSecundario, claseInput } from '@/components/estilos'
import { mensajeError } from '@/lib/supabase'
import { useGuardarProducto } from './api'
import {
  esquemaProducto,
  NOMBRE_DESPACHO,
  UNIDADES_ACCESORIO,
  type DatosProducto,
  type Producto,
  type Proveedor,
} from './tipos'

interface Props {
  producto: Producto | null // null = producto nuevo
  proveedores: Proveedor[] // para el selector de proveedor
  alTerminar: () => void // se llama al guardar o cancelar
}

/** Valores iniciales de un producto nuevo (piso, despacho por caja y pieza). */
const VALORES_NUEVO: DatosProducto = {
  codigo: '',
  nombre: '',
  tipo: 'piso',
  categoria: '',
  medida: '',
  unidad: 'pieza',
  piezas_por_caja: null,
  despacho: 'caja_y_pieza',
  stock_minimo: 0,
  proveedor_id: null,
}

/**
 * aValoresFormulario: convierte un producto guardado en valores del formulario.
 */
function aValoresFormulario(p: Producto): DatosProducto {
  return {
    codigo: p.codigo,
    nombre: p.nombre,
    tipo: p.tipo,
    categoria: p.categoria,
    medida: p.medida ?? '',
    unidad: p.unidad,
    piezas_por_caja: p.piezas_por_caja,
    despacho: p.despacho,
    stock_minimo: p.stock_minimo,
    proveedor_id: p.proveedor_id,
  }
}

/**
 * FormularioProducto: muestra los campos según el tipo, valida y guarda.
 */
export function FormularioProducto({ producto, proveedores, alTerminar }: Props) {
  const guardar = useGuardarProducto()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DatosProducto>({
    resolver: zodResolver(esquemaProducto),
    defaultValues: producto ? aValoresFormulario(producto) : VALORES_NUEVO,
  })

  // Tipo elegido en este momento (para mostrar u ocultar campos)
  const tipo = useWatch({ control, name: 'tipo' })
  const esPiso = tipo === 'piso'

  /** enviar: guarda el producto y cierra el formulario si todo salió bien. */
  const enviar = async (datos: DatosProducto) => {
    setError(null)
    try {
      await guardar.mutateAsync({ id: producto?.id, datos })
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
      <h2 className="font-semibold">{producto ? 'Editar producto' : 'Nuevo producto'}</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Campo etiqueta="Código" error={errors.codigo?.message} ayuda="Se guarda en mayúsculas">
          <input {...register('codigo')} className={claseInput} />
        </Campo>

        <Campo etiqueta="Nombre" error={errors.nombre?.message}>
          <input {...register('nombre')} className={claseInput} />
        </Campo>

        <Campo etiqueta="Tipo de producto" error={errors.tipo?.message}>
          <select
            {...register('tipo', {
              // Al cambiar el tipo, ajustar unidad y despacho a valores válidos
              onChange: (e) => {
                const piso = e.target.value === 'piso'
                setValue('unidad', piso ? 'pieza' : 'bolsa')
                setValue('despacho', piso ? 'caja_y_pieza' : 'unidad')
              },
            })}
            className={claseInput}
          >
            <option value="piso">Piso / revestimiento (cajas y piezas)</option>
            <option value="accesorio">Accesorio / material (por unidad)</option>
          </select>
        </Campo>

        <Campo
          etiqueta="Categoría"
          error={errors.categoria?.message}
          ayuda="Ej. Porcelanato, Cerámica, Pegamento"
        >
          <input {...register('categoria')} className={claseInput} />
        </Campo>

        {/* Campos solo para pisos */}
        {esPiso && (
          <>
            <Campo etiqueta="Medida" error={errors.medida?.message} ayuda="Ej. 60x120">
              <input {...register('medida')} className={claseInput} />
            </Campo>

            <Campo etiqueta="Piezas por caja" error={errors.piezas_por_caja?.message}>
              <input
                type="number"
                min={1}
                {...register('piezas_por_caja', { valueAsNumber: true })}
                className={claseInput}
              />
            </Campo>

            <Campo etiqueta="Se despacha por" error={errors.despacho?.message}>
              <select {...register('despacho')} className={claseInput}>
                <option value="caja_y_pieza">{NOMBRE_DESPACHO.caja_y_pieza}</option>
                <option value="caja">{NOMBRE_DESPACHO.caja}</option>
                <option value="pieza">{NOMBRE_DESPACHO.pieza}</option>
              </select>
            </Campo>
          </>
        )}

        {/* Campo solo para accesorios */}
        {!esPiso && (
          <Campo etiqueta="Unidad" error={errors.unidad?.message}>
            <select {...register('unidad')} className={claseInput}>
              {UNIDADES_ACCESORIO.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Campo>
        )}

        <Campo
          etiqueta={esPiso ? 'Stock mínimo (en piezas)' : 'Stock mínimo (en unidades)'}
          error={errors.stock_minimo?.message}
          ayuda="Para alertas de reabastecimiento. 0 = sin alerta"
        >
          <input
            type="number"
            min={0}
            {...register('stock_minimo', { valueAsNumber: true })}
            className={claseInput}
          />
        </Campo>

        <Campo etiqueta="Proveedor" error={errors.proveedor_id?.message}>
          <select
            {...register('proveedor_id', {
              // El selector entrega texto; lo convertimos a número o null
              setValueAs: (v) => (v === '' || v === null ? null : Number(v)),
            })}
            className={claseInput}
          >
            <option value="">— Sin proveedor —</option>
            {proveedores
              .filter((p) => p.activo || p.id === producto?.proveedor_id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
          </select>
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
