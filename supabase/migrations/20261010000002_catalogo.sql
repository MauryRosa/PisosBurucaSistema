-- =====================================================================
-- Migración 02: Catálogo de productos, proveedores y ubicaciones
-- Requerimientos: RF-01 a RF-08
-- Regla: las cantidades se guardan en UNIDAD BASE
--        (piezas para pisos, unidades para accesorios).
-- =====================================================================

-- Tipo de producto: define cómo se ingresa y se muestra el stock (RF-02)
create type public.tipo_producto as enum ('piso', 'accesorio');

-- Cómo se despacha el producto (RF-03)
create type public.forma_despacho as enum ('caja', 'pieza', 'caja_y_pieza', 'unidad');

-- ---------------------------------------------------------------------
-- Tabla: proveedores
-- ---------------------------------------------------------------------
create table public.proveedores (
  id         bigint generated always as identity primary key,
  nombre     text not null unique,
  contacto   text,
  telefono   text,
  activo     boolean not null default true,
  creado_en  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Tabla: productos (RF-01 a RF-05)
-- Pisos: llevan piezas por caja. Accesorios: una sola unidad (bolsa, unidad...).
-- ---------------------------------------------------------------------
create table public.productos (
  id               bigint generated always as identity primary key,
  codigo           text not null unique,                 -- código interno único
  nombre           text not null,
  tipo             public.tipo_producto not null,         -- piso o accesorio
  categoria        text not null,                         -- Porcelanato, Cerámica, Pegamento...
  medida           text,                                  -- ej. 60x120 (solo pisos)
  unidad           text not null default 'pieza',         -- pieza, bolsa, unidad, galón...
  piezas_por_caja  integer,                               -- factor de empaque (solo pisos)
  despacho         public.forma_despacho not null,        -- RF-03
  stock_minimo     integer not null default 0 check (stock_minimo >= 0), -- RF-04, en unidad base
  proveedor_id     bigint references public.proveedores (id),
  activo           boolean not null default true,         -- RF-05: desactivar sin borrar historial
  creado_en        timestamptz not null default now(),

  -- Regla de negocio: un piso SIEMPRE tiene piezas por caja; un accesorio NUNCA
  constraint productos_piso_tiene_caja check (
    (tipo = 'piso' and piezas_por_caja > 0 and despacho in ('caja', 'pieza', 'caja_y_pieza'))
    or
    (tipo = 'accesorio' and piezas_por_caja is null and despacho = 'unidad')
  )
);

create index productos_nombre_idx on public.productos (lower(nombre)); -- búsquedas por nombre
create index productos_categoria_idx on public.productos (categoria);

-- ---------------------------------------------------------------------
-- Tabla: ubicaciones (RF-06 a RF-08)
-- ---------------------------------------------------------------------
create table public.ubicaciones (
  id            smallint generated always as identity primary key,
  nombre        text not null unique,
  es_principal  boolean not null default false, -- todo sale primero de la principal
  activa        boolean not null default true
);

-- Solo puede existir UNA bodega principal
create unique index ubicaciones_una_principal on public.ubicaciones (es_principal) where es_principal;

-- Ubicaciones iniciales acordadas
insert into public.ubicaciones (nombre, es_principal) values
  ('Bodega principal', true),
  ('Minibodega sala de ventas', false);

-- ---------------------------------------------------------------------
-- Bitácora: auditar cambios del catálogo
-- ---------------------------------------------------------------------
create trigger bitacora_proveedores after insert or update or delete on public.proveedores
  for each row execute function public.registrar_bitacora();
create trigger bitacora_productos after insert or update or delete on public.productos
  for each row execute function public.registrar_bitacora();
create trigger bitacora_ubicaciones after insert or update or delete on public.ubicaciones
  for each row execute function public.registrar_bitacora();

-- ---------------------------------------------------------------------
-- Seguridad: todos con sesión leen el catálogo; solo el administrador lo edita
-- ---------------------------------------------------------------------
alter table public.proveedores enable row level security;
alter table public.productos   enable row level security;
alter table public.ubicaciones enable row level security;

create policy "leer proveedores" on public.proveedores for select to authenticated using (true);
create policy "leer productos"   on public.productos   for select to authenticated using (true);
create policy "leer ubicaciones" on public.ubicaciones for select to authenticated using (true);

create policy "admin crea proveedores" on public.proveedores for insert to authenticated
  with check (public.rol_actual() = 'administrador');
create policy "admin edita proveedores" on public.proveedores for update to authenticated
  using (public.rol_actual() = 'administrador') with check (public.rol_actual() = 'administrador');

create policy "admin crea productos" on public.productos for insert to authenticated
  with check (public.rol_actual() = 'administrador');
create policy "admin edita productos" on public.productos for update to authenticated
  using (public.rol_actual() = 'administrador') with check (public.rol_actual() = 'administrador');

create policy "admin crea ubicaciones" on public.ubicaciones for insert to authenticated
  with check (public.rol_actual() = 'administrador');
create policy "admin edita ubicaciones" on public.ubicaciones for update to authenticated
  using (public.rol_actual() = 'administrador') with check (public.rol_actual() = 'administrador');