-- Skylog V2.0 — Organización. Logo de la empresa, mostrado en la esquina
-- superior izquierda del sidebar (pedido explícito del usuario). Columna
-- nueva, nullable — sin logo hasta que un gestor lo suba.

alter table organizations add column logo_url text;

comment on column organizations.logo_url is 'URL pública del logo (bucket R2 partner-logos, key v2-orgs/{organization_id}/...) — nullable, se muestra en el sidebar cuando existe.';
