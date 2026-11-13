-- Auditoría de seguridad 2026-11-12 (puente de Android): la app instalada descargaba el APK de `apk_url` y lo instalaba
-- sin comprobar su contenido. Cada versión nueva publica ahora la huella SHA-256 del APK y la app la verifica antes de
-- lanzar el instalador (AppUpdatePlugin). Nullable: la versión vigente (1.1.0, código 2) no la tiene y las apps que ya
-- están instaladas no la leen; la app nueva se niega a instalar una versión sin huella.
-- Reversible: `alter table public.app_releases drop column apk_sha256;`
alter table public.app_releases add column if not exists apk_sha256 text;
alter table public.app_releases drop constraint if exists app_releases_apk_sha256_format;
alter table public.app_releases add constraint app_releases_apk_sha256_format check (apk_sha256 is null or apk_sha256 ~ '^[0-9a-f]{64}$');
comment on column public.app_releases.apk_sha256 is 'SHA-256 del APK en hexadecimal minúsculas; la app lo compara con lo descargado antes de instalar.';
