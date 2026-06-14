-- Logo del socio (escuela/asesor) para branding en correos y panel
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS logo_url text;

-- Bucket público para logos de socios
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-logos', 'partner-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas: lectura pública; escritura/borrado solo service role (el gate es el API).
DROP POLICY IF EXISTS "partner_logos_public_read" ON storage.objects;
CREATE POLICY "partner_logos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'partner-logos');
