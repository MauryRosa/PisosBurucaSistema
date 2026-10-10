-- =====================================================================
-- Migración 09: Metros cuadrados por caja en los productos tipo piso
-- Ejemplo: Porcelanato Carrara Blanco 60x120, 3 piezas por caja,
--          2.16 m² por caja.
--
-- * Es un dato informativo del catálogo: el inventario se sigue llevando
--   en cajas y piezas (unidad base = pieza), como se acordó.
-- * Es opcional (puede quedar vacío) y solo aplica a pisos; los
--   accesorios no llevan metros.
-- =====================================================================

alter table public.productos
  add column m2_por_caja numeric(8, 4);

-- Si se indica, debe ser mayor que cero
alter table public.productos
  add constraint productos_m2_positivo check (m2_por_caja is null or m2_por_caja > 0);

-- Solo los pisos llevan metros por caja
alter table public.productos
  add constraint productos_m2_solo_pisos check (tipo = 'piso' or m2_por_caja is null);

comment on column public.productos.m2_por_caja is
  'Metros cuadrados que cubre una caja (solo pisos, opcional). Ej. 2.16';
