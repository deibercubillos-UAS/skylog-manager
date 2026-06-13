-- Bucket público para imágenes de aeronaves.
-- No contiene datos sensibles (documentos de identidad, certificados, etc.)
-- → acceso directo sin signed URL, elimina el roundtrip servidor en AircraftCard.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fleet-images',
  'fleet-images',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── Políticas de storage ────────────────────────────────────────────────────
-- Solo los miembros autenticados de la misma org pueden subir/borrar.
-- Cualquiera puede leer (bucket público).

DROP POLICY IF EXISTS "fleet_images_insert" ON storage.objects;
CREATE POLICY "fleet_images_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'fleet-images'
    AND (storage.foldername(name))[1] = (
      SELECT organization_id::text FROM public.profiles
      WHERE id = auth.uid() LIMIT 1
    )
  );

DROP POLICY IF EXISTS "fleet_images_update" ON storage.objects;
CREATE POLICY "fleet_images_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'fleet-images'
    AND (storage.foldername(name))[1] = (
      SELECT organization_id::text FROM public.profiles
      WHERE id = auth.uid() LIMIT 1
    )
  );

DROP POLICY IF EXISTS "fleet_images_delete" ON storage.objects;
CREATE POLICY "fleet_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'fleet-images'
    AND (storage.foldername(name))[1] = (
      SELECT organization_id::text FROM public.profiles
      WHERE id = auth.uid() LIMIT 1
    )
  );

-- Lectura pública (el bucket ya es público, pero la política explícita es buena práctica)
DROP POLICY IF EXISTS "fleet_images_select" ON storage.objects;
CREATE POLICY "fleet_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'fleet-images');
