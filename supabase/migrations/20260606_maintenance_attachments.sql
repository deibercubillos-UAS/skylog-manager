-- Migración: Adjuntos en registros de mantenimiento
-- Permite adjuntar un documento (PDF o imagen) a cada intervención

ALTER TABLE maintenance_logs
  ADD COLUMN IF NOT EXISTS attachment_path TEXT;

COMMENT ON COLUMN maintenance_logs.attachment_path IS
  'Ruta en Supabase Storage (bucket maintenance-docs) del documento adjunto. Nullable.';

-- ── Bucket privado para documentos de mantenimiento ───────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'maintenance-docs',
  'maintenance-docs',
  false,
  10485760,   -- 10 MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
) ON CONFLICT (id) DO NOTHING;

-- ── Políticas de Storage (RLS sobre storage.objects) ─────────────────────
-- Los miembros solo pueden operar dentro de la carpeta de su propia org.

CREATE POLICY "maintenance_docs_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'maintenance-docs' AND
  name LIKE 'orgs/' || (
    SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
  ) || '/%'
);

CREATE POLICY "maintenance_docs_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'maintenance-docs' AND
  name LIKE 'orgs/' || (
    SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
  ) || '/%'
);

CREATE POLICY "maintenance_docs_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'maintenance-docs' AND
  name LIKE 'orgs/' || (
    SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
  ) || '/%'
);
