-- Tabla de versiones de la app Android (OTA updates sin Google Play).
-- El superadmin inserta una fila nueva por cada release; la app consulta
-- GET /api/app/version y se auto-actualiza si hay una versión más nueva.

CREATE TABLE IF NOT EXISTS app_releases (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version_name    text NOT NULL,          -- "1.1.0" — visible al usuario
    version_code    integer NOT NULL,       -- 2, 3, 4… — usado para comparar
    apk_url         text NOT NULL,          -- URL pública del .apk en Supabase Storage
    release_notes   text,                  -- Descripción del cambio (mostrada en el dialog)
    force_update    boolean NOT NULL DEFAULT false,  -- true = el dialog no se puede cerrar
    is_current      boolean NOT NULL DEFAULT true,   -- false = versión retirada
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Solo superadmin puede leer/escribir (el endpoint usa service_role).
-- No hay RLS pública porque el endpoint es público pero usa createAdminClient().
ALTER TABLE app_releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_all" ON app_releases
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'superadmin'
        )
    );

-- Bucket público para los APKs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'app-releases',
    'app-releases',
    true,
    104857600,  -- 100 MB
    ARRAY['application/vnd.android.package-archive', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- Política: lectura pública
CREATE POLICY "public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'app-releases');

-- Escritura solo service_role (subida manual o desde panel master)
-- No se crea política de INSERT/UPDATE/DELETE → solo service_role tiene acceso

-- Versión inicial (actualizar apk_url tras subir el APK)
INSERT INTO app_releases (version_name, version_code, apk_url, release_notes, force_update, is_current)
VALUES (
    '1.1.0',
    2,
    '',   -- rellenar tras subir el APK al bucket app-releases
    'Optimización de interfaz para controles DJI RC Plus. Actualización automática de la app.',
    false,
    true
);
