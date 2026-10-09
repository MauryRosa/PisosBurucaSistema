/**
 * api.ts (módulo Catálogo)
 * Todas las lecturas y escrituras del catálogo en Supabase.
 * Cada función es un "hook" de React Query: guarda los datos en memoria y
 * vuelve a consultar automáticamente cuando algo cambia.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DatosProducto, DatosProveedor, Producto, Proveedor, Ubicacion } from './tipos'

// ---------------- Proveedores ----------------

/** useProveedores: lista todos los proveedores ordenados por nombre. */
export function useProveedores() {
  return useQuery({
    queryKey: ['proveedores'],
    queryFn: async (): Promise<Proveedor[]> => {
      const { data, error } = await supabase.from('proveedores').select('*').order('nombre')
      if (error) throw error
      return data as Proveedor[]
    },
  })
}

/**
 * useGuardarProveedor: crea un proveedor (sin id) o actualiza uno existente (con id).
 */
export function useGuardarProveedor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, datos }: { id?: number; datos: DatosProveedor }) => {
      // Campos vacíos se guardan como null
      const fila = {
        nombre: datos.nombre,
        contacto: datos.contacto || null,
        telefono: datos.telefono || null,
      }
      const { error } = id
        ? await supabase.from('proveedores').update(fila).eq('id', id)
        : await supabase.from('proveedores').insert(fila)
      if (error) throw error
    },
    // Al guardar, refrescar la lista de proveedores y la de productos (muestran el nombre)
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] })
      queryClient.invalidateQueries({ queryKey: ['productos'] })
    },
  })
}

// ---------------- Productos ----------------

/** useProductos: lista todos los productos con el nombre de su proveedor. */
export function useProductos() {
  return useQuery({
    queryKey: ['productos'],
    queryFn: async (): Promise<Producto[]> => {
      const { data, error } = await supabase
        .from('productos')
        .select('*, proveedores(nombre)')
        .order('nombre')
      if (error) throw error
      return data as Producto[]
    },
  })
}

/**
 * aFilaProducto: prepara los datos del formulario para guardarlos.
 * Aplica las reglas de la base de datos según el tipo:
 *  - piso: unidad "pieza", con piezas por caja y medida
 *  - accesorio: sin piezas por caja ni medida, despacho "unidad"
 */
function aFilaProducto(d: DatosProducto) {
  const esPiso = d.tipo === 'piso'
  return {
    codigo: d.codigo.toUpperCase(),
    nombre: d.nombre,
    tipo: d.tipo,
    categoria: d.categoria,
    medida: esPiso && d.medida ? d.medida : null,
    unidad: esPiso ? 'pieza' : d.unidad,
    piezas_por_caja: esPiso ? d.piezas_por_caja : null,
    despacho: esPiso ? d.despacho : 'unidad',
    stock_minimo: d.stock_minimo,
    proveedor_id: d.proveedor_id,
  }
}

/**
 * useGuardarProducto: crea un producto (sin id) o actualiza uno existente (con id).
 */
export function useGuardarProducto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, datos }: { id?: number; datos: DatosProducto }) => {
      const fila = aFilaProducto(datos)
      const { error } = id
        ? await supabase.from('productos').update(fila).eq('id', id)
        : await supabase.from('productos').insert(fila)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['productos'] }),
  })
}

// ---------------- Activar / desactivar (RF-05) ----------------

/**
 * useCambiarActivo: activa o desactiva un producto o proveedor.
 * Nunca se borra nada, para no perder el historial.
 */
export function useCambiarActivo(tabla: 'productos' | 'proveedores') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, activo }: { id: number; activo: boolean }) => {
      const { error } = await supabase.from(tabla).update({ activo }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [tabla] }),
  })
}

// ---------------- Ubicaciones ----------------

/** useUbicaciones: lista las ubicaciones (bodega principal primero). */
export function useUbicaciones() {
  return useQuery({
    queryKey: ['ubicaciones'],
    queryFn: async (): Promise<Ubicacion[]> => {
      const { data, error } = await supabase
        .from('ubicaciones')
        .select('*')
        .order('es_principal', { ascending: false })
        .order('nombre')
      if (error) throw error
      return data as Ubicacion[]
    },
  })
}
