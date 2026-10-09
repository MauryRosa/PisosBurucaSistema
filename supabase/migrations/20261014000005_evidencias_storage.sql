-- =====================================================================
-- Migración 05: Almacenamiento de evidencias (Supabase Storage)
-- Requerimientos: RF-20 (carta de merma firmada), RF-30 (foto o firma de entrega)
--
-- Crea un "bucket" privado llamado "evidencias". Los archivos NO son públicos:
-- solo bodega y administración pueden subirlos y verlos, y se abren con
-- enlaces temporales que vencen en 5 minutos.
-- En documentos.evidencia_url se guarda la RUTA del archivo dentro del bucket.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Bucket privado: fotos (JPG, PNG, WEBP) y PDF de máximo 5 MB
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidencias',
  'evidencias',
  false,                                                          -- privado
  5242880,                                                        -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Seguridad: solo jefe de bodega y administrador suben y ven evidencias.
-- Nadie las puede editar ni borrar (quedan como respaldo).
-- ---------------------------------------------------------------------
create policy "bodega sube evidencias" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evidencias' and public.rol_actual() in ('jefe_bodega', 'administrador'));

create policy "bodega ve evidencias" on storage.objects
  for select to authenticated
  using (bucket_id = 'evidencias' and public.rol_actual() in ('jefe_bodega', 'administrador'));