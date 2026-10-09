-- =====================================================================
-- Migración 01: Usuarios, roles y bitácora
-- Requerimientos: RF-40 (inicio de sesión y permisos por rol)
--                 RF-41 (bitácora de cambios), RNF-13 (auditoría)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipo: roles del sistema (3 roles acordados)
-- ---------------------------------------------------------------------
create type public.rol_usuario as enum ('administrador', 'jefe_bodega', 'vendedora');

-- ---------------------------------------------------------------------
-- Tabla: perfiles
-- Datos de cada usuario del sistema. Se liga 1 a 1 con auth.users,
-- que es la tabla de login que administra Supabase.
-- ---------------------------------------------------------------------
create table public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade, -- mismo id que el login
  nombre     text not null,                                                 -- nombre visible
  rol        public.rol_usuario not null default 'vendedora',               -- permisos
  activo     boolean not null default true,                                 -- false = no puede entrar
  creado_en  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Función: rol_actual
-- Devuelve el rol del usuario que está haciendo la consulta.
-- Devuelve null si no tiene perfil o si está desactivado.
-- Se usa en las reglas de seguridad (RLS) y en las funciones de stock.
-- ---------------------------------------------------------------------
create or replace function public.rol_actual()
returns public.rol_usuario
language sql
stable
security definer          -- se ejecuta con permisos del dueño para poder leer perfiles
set search_path = public
as $$
  select rol from public.perfiles where id = auth.uid() and activo;
$$;

-- ---------------------------------------------------------------------
-- Función: exigir_rol
-- Detiene la operación con un error si el usuario no tiene uno de los
-- roles indicados. Ejemplo: perform exigir_rol('administrador');
-- ---------------------------------------------------------------------
create or replace function public.exigir_rol(variadic p_roles public.rol_usuario[])
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.rol_actual() is null or not (public.rol_actual() = any (p_roles)) then
    raise exception 'No tiene permiso para esta operación' using errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Función + trigger: crear_perfil_nuevo_usuario
-- Cada vez que se crea un usuario en Supabase Auth, le crea su perfil
-- automáticamente con rol "vendedora". El administrador cambia el rol después.
-- ---------------------------------------------------------------------
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)), -- nombre o parte del correo
    'vendedora'
  );
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();

-- ---------------------------------------------------------------------
-- Tabla: bitacora
-- Registro de auditoría: quién cambió qué, cuándo, y el valor anterior/nuevo.
-- Nadie puede editarla; solo el administrador puede leerla.
-- ---------------------------------------------------------------------
create table public.bitacora (
  id              bigint generated always as identity primary key,
  usuario_id      uuid,                         -- quién hizo el cambio
  fecha           timestamptz not null default now(),
  accion          text not null,                -- INSERT, UPDATE o DELETE
  tabla           text not null,                -- tabla afectada
  registro_id     text,                         -- id del registro afectado
  valor_anterior  jsonb,                        -- cómo estaba antes
  valor_nuevo     jsonb                         -- cómo quedó
);

create index bitacora_fecha_idx on public.bitacora (fecha desc);
create index bitacora_tabla_idx on public.bitacora (tabla, registro_id);

-- ---------------------------------------------------------------------
-- Función: registrar_bitacora
-- Se conecta como trigger a cada tabla importante y guarda en bitacora
-- cada alta, cambio o borrado, con el usuario que lo hizo.
-- ---------------------------------------------------------------------
create or replace function public.registrar_bitacora()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.bitacora (usuario_id, accion, tabla, registro_id, valor_anterior, valor_nuevo)
  values (
    auth.uid(),
    tg_op,                                                         -- tipo de operación
    tg_table_name,                                                 -- nombre de la tabla
    coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id'),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

-- Auditar cambios en perfiles (por ejemplo, cambios de rol)
create trigger bitacora_perfiles
  after insert or update or delete on public.perfiles
  for each row execute function public.registrar_bitacora();

-- ---------------------------------------------------------------------
-- Seguridad (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.perfiles enable row level security;
alter table public.bitacora enable row level security;

-- Cualquier usuario con sesión puede ver los perfiles (nombres de vendedoras, etc.)
create policy "leer perfiles" on public.perfiles
  for select to authenticated using (true);

-- Solo el administrador puede cambiar nombres, roles o desactivar usuarios
create policy "admin edita perfiles" on public.perfiles
  for update to authenticated
  using (public.rol_actual() = 'administrador')
  with check (public.rol_actual() = 'administrador');

-- Solo el administrador puede leer la bitácora (nadie la edita)
create policy "admin lee bitacora" on public.bitacora
  for select to authenticated using (public.rol_actual() = 'administrador');

-- Las funciones internas no se pueden llamar desde la aplicación
revoke execute on function public.crear_perfil_nuevo_usuario() from public, anon, authenticated;
revoke execute on function public.registrar_bitacora() from public, anon, authenticated;