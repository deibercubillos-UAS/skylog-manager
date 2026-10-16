-- Auditoría 2026-10-16 — limpieza de restos de la v1 en la base de producción.

-- 1) Políticas de Supabase Storage de la v1. La V2 guarda todos los archivos en R2 (0 usos de Supabase Storage en el
--    código), así que estas políticas solo abrían caminos que nadie usa. Una permitía a CUALQUIERA, sin sesión, subir
--    archivos al bucket `vor-mor-attachments`; las demás leían `legacy_v1.profiles`. Se conserva la del service role.
drop policy if exists "Folder_Isolation_Delete" on storage.objects;
drop policy if exists "Folder_Isolation_Insert" on storage.objects;
drop policy if exists "Folder_Isolation_Read" on storage.objects;
drop policy if exists "company_manuals_storage_delete" on storage.objects;
drop policy if exists "company_manuals_storage_insert" on storage.objects;
drop policy if exists "company_manuals_storage_select" on storage.objects;
drop policy if exists "fleet_images_delete" on storage.objects;
drop policy if exists "fleet_images_insert" on storage.objects;
drop policy if exists "fleet_images_update" on storage.objects;
drop policy if exists "maintenance_docs_delete" on storage.objects;
drop policy if exists "maintenance_docs_insert" on storage.objects;
drop policy if exists "maintenance_docs_select" on storage.objects;
drop policy if exists "org read vor-mor attachments" on storage.objects;
drop policy if exists "public upload vor-mor" on storage.objects;

-- 2) `legacy_v1` no se expone a la API, pero sus 84 tablas conservaban permisos completos para anon/authenticated:
--    si alguien expusiera el esquema por error, quedarían abiertas (perfiles, datos de v1). Se retiran.
revoke all on all tables in schema legacy_v1 from anon, authenticated;
revoke all on all sequences in schema legacy_v1 from anon, authenticated;
alter default privileges in schema legacy_v1 revoke all on tables from anon, authenticated;

-- 3) Rol de solo lectura del ETL de la migración (ya terminada): deja de poder iniciar sesión. Reversible con LOGIN.
alter role etl_solo_lectura nologin;
