-- =====================================================================
-- Migración 03: Tablas de movimientos de inventario
-- Requerimientos: RF-14 a RF-32, RF-36, RNF-01 a RNF-03
--
-- Idea general:
--   * "existencias" guarda el saldo actual de cada producto en cada ubicación.
--   * Todo cambio de saldo nace de un "documento" (entrada, salida, traslado,
--     merma...) con sus líneas en "detalle_documento".
--   * Las existencias NUNCA se editan directo: solo las funciones de la
--     migración 04 las mueven (así queda todo trazado).
--   * Cantidades siempre en UNIDAD BASE (piezas o unidades).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------

-- Comprobante de venta emitido en el sistema comercial (Hacienda)
create type public.tipo_comprobante as enum ('factura', 'recibo');

-- Todos los movimientos posibles de inventario
create type public.tipo_documento as enum (
  'entrada_compra',             -- recepción de proveedor (RF-10 a RF-12)
  'entrada_devolucion_cliente', -- cliente devuelve producto (RF-13)
  'inventario_inicial',         -- carga del conteo inicial (RF-14)
  'salida_venta',               -- venta despachada desde bodega principal (RF-16 a RF-18)
  'despacho_minibodega',        -- venta entregada desde la minibodega (RF-32)
  'traslado',                   -- bodega principal → minibodega (RF-19)
  'merma',                      -- producto dañado, requiere aprobación (RF-20)
  'consumo_interno',            -- uso en tienda o remodelación (RF-21)
  'exhibicion',                 -- muestras en exhibición (RF-22)
  'devolucion_proveedor',       -- se devuelve al proveedor (RF-23)
  'cambio_garantia',            -- cambio a cliente: entra uno, sale otro (RF-24)
  'ajuste'                      -- corrección por conteo, requiere aprobación (RF-37)
);

-- Estado de un documento
create type public.estado_documento as enum ('pendiente', 'aprobado', 'anulado');

-- Estado de una reserva
create type public.estado_reserva as enum ('activa', 'consumida', 'cancelada');

-- ---------------------------------------------------------------------
-- Tabla: existencias (saldo actual por producto y ubicación)
-- ---------------------------------------------------------------------
create table public.existencias (
  producto_id     bigint   not null references public.productos (id),
  ubicacion_id    smallint not null references public.ubicaciones (id),
  cantidad        integer  not null default 0 check (cantidad >= 0), -- RNF-02: nunca negativo
  actualizado_en  timestamptz not null default now(),
  primary key (producto_id, ubicacion_id)
);

-- ---------------------------------------------------------------------
-- Tabla: correlativos (último número usado por serie y año) · RF-29
-- Ej.: serie VEN, año 2026, último 15 → la próxima salida es VEN-2026-00016
-- ---------------------------------------------------------------------
create table public.correlativos (
  serie   text    not null,
  anio    integer not null,
  ultimo  integer not null default 0,
  primary key (serie, anio)
);

-- ---------------------------------------------------------------------
-- Tabla: documentos (cabecera de cada movimiento)
-- ---------------------------------------------------------------------
create table public.documentos (
  id                   bigint generated always as identity primary key,
  tipo                 public.tipo_documento not null,
  serie                text    not null,                   -- VEN, TRA, ENT, INI, MER, AJU, MOV
  anio                 integer not null,
  correlativo          integer not null,
  -- Número visible, ej. VEN-2026-00001 (se calcula solo)
  numero               text generated always as
                         (serie || '-' || anio::text || '-' || lpad(correlativo::text, 5, '0')) stored,
  fecha                timestamptz not null default now(),
  estado               public.estado_documento not null default 'aprobado',

  -- Venta ligada (factura o recibo del sistema comercial) · RF-16 a RF-18
  tipo_comprobante     public.tipo_comprobante,
  numero_comprobante   text,

  -- Entradas de proveedor y devoluciones a proveedor
  proveedor_id         bigint references public.proveedores (id),
  documento_proveedor  text,                                -- factura o nota de remisión del proveedor

  -- Entrega · RF-30
  retira_nombre        text,                                -- cliente o transportista
  retira_placa         text,
  evidencia_url        text,                                -- foto, firma o carta de merma
  motivo               text,                                -- obligatorio en merma, ajuste, consumo, exhibición

  -- Trazabilidad: quién creó, aprobó o anuló
  creado_por           uuid not null references public.perfiles (id),
  creado_en            timestamptz not null default now(),
  aprobado_por         uuid references public.perfiles (id),
  aprobado_en          timestamptz,
  anulado_por          uuid references public.perfiles (id),
  anulado_en           timestamptz,
  motivo_anulacion     text,

  constraint documentos_correlativo_unico unique (serie, anio, correlativo),
  -- Si hay tipo de comprobante debe haber número, y viceversa
  constraint documentos_comprobante_completo check ((tipo_comprobante is null) = (numero_comprobante is null))
);

-- RF-18: un número de factura o recibo solo se liga a UNA salida por venta vigente
create unique index documentos_comprobante_unico
  on public.documentos (tipo_comprobante, numero_comprobante)
  where tipo in ('salida_venta', 'despacho_minibodega') and estado <> 'anulado';

create index documentos_fecha_idx on public.documentos (fecha desc);
create index documentos_tipo_idx on public.documentos (tipo, estado);

-- ---------------------------------------------------------------------
-- Tabla: detalle_documento (líneas de cada documento)
-- origen null  = entra al inventario
-- destino null = sale del inventario
-- ambos        = traslado entre ubicaciones
-- ---------------------------------------------------------------------
create table public.detalle_documento (
  id                    bigint generated always as identity primary key,
  documento_id          bigint   not null references public.documentos (id),
  producto_id           bigint   not null references public.productos (id),
  ubicacion_origen_id   smallint references public.ubicaciones (id),
  ubicacion_destino_id  smallint references public.ubicaciones (id),
  cantidad              integer  not null check (cantidad > 0), -- unidad base
  constraint detalle_tiene_ubicacion check (ubicacion_origen_id is not null or ubicacion_destino_id is not null),
  constraint detalle_ubicaciones_distintas check (ubicacion_origen_id is distinct from ubicacion_destino_id)
);

create index detalle_documento_doc_idx on public.detalle_documento (documento_id);
create index detalle_documento_producto_idx on public.detalle_documento (producto_id);

-- ---------------------------------------------------------------------
-- Tabla: reservas · RF-26 a RF-28
-- Producto apartado para una venta. Resta del disponible, no del físico.
-- ---------------------------------------------------------------------
create table public.reservas (
  id                  bigint generated always as identity primary key,
  producto_id         bigint   not null references public.productos (id),
  ubicacion_id        smallint not null references public.ubicaciones (id),
  cantidad            integer  not null check (cantidad > 0), -- unidad base
  vendedora_id        uuid not null references public.perfiles (id), -- quién la pidió
  tipo_comprobante    public.tipo_comprobante,
  numero_comprobante  text,
  notas               text,
  estado              public.estado_reserva not null default 'activa',
  motivo_cancelacion  text,
  documento_id        bigint references public.documentos (id),     -- salida que la consumió
  creado_por          uuid not null references public.perfiles (id), -- jefe de bodega que la registró
  creado_en           timestamptz not null default now()
);

create index reservas_activas_idx on public.reservas (producto_id, ubicacion_id) where estado = 'activa';

-- ---------------------------------------------------------------------
-- Bitácora: auditar documentos, sus líneas y reservas (RF-41)
-- ---------------------------------------------------------------------
create trigger bitacora_documentos after insert or update or delete on public.documentos
  for each row execute function public.registrar_bitacora();
create trigger bitacora_detalle_documento after insert or update or delete on public.detalle_documento
  for each row execute function public.registrar_bitacora();
create trigger bitacora_reservas after insert or update or delete on public.reservas
  for each row execute function public.registrar_bitacora();

-- ---------------------------------------------------------------------
-- Seguridad (RLS)
-- Lectura según rol. NO hay políticas de escritura: solo se escribe
-- mediante las funciones de la migración 04.
-- ---------------------------------------------------------------------
alter table public.existencias       enable row level security;
alter table public.correlativos      enable row level security;
alter table public.documentos        enable row level security;
alter table public.detalle_documento enable row level security;
alter table public.reservas          enable row level security;

-- Todos ven existencias y reservas (necesario para calcular el disponible)
create policy "leer existencias" on public.existencias for select to authenticated using (true);
create policy "leer reservas"    on public.reservas    for select to authenticated using (true);

-- Documentos: solo bodega y administración
create policy "bodega lee documentos" on public.documentos for select to authenticated
  using (public.rol_actual() in ('jefe_bodega', 'administrador'));
create policy "bodega lee detalle" on public.detalle_documento for select to authenticated
  using (public.rol_actual() in ('jefe_bodega', 'administrador'));

-- correlativos: sin políticas = nadie lo lee ni escribe directo

-- ---------------------------------------------------------------------
-- Tiempo real (RNF-04): avisar a las pantallas cuando cambia el stock
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.existencias, public.reservas;
  end if;
end;
$$;