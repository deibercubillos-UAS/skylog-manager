-- Auditoría 2026-06-12 — correcciones de funcionamiento, seguridad y rendimiento

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Columnas que el código ya usa pero no existían en la tabla pilots:
--    · GET /api/pilots selecciona avatar_url y aerocivil_additions (el SELECT
--      fallaba y los callers recibían lista vacía silenciosamente)
--    · AddPilotPanel inserta aerocivil_additions (array de adiciones marcadas)
--    · PATCH /api/pilots/[id] permite notes y avatar_url
-- ──────────────────────────────────────────────────────────────────────────
alter table public.pilots
  add column if not exists avatar_url text,
  add column if not exists aerocivil_additions jsonb default '[]'::jsonb,
  add column if not exists notes text;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Storage: el bucket `documents` tenía dos políticas legacy demasiado
--    permisivas que permitían a CUALQUIER usuario autenticado subir a
--    cualquier ruta y borrar archivos de otras organizaciones.
--    Las políticas Folder_Isolation_* ya cubren el patrón {orgId}/... que
--    usa FileUpload.js, así que estas sobran.
-- ──────────────────────────────────────────────────────────────────────────
drop policy if exists "Permitir borrado a dueños" on storage.objects;
drop policy if exists "Permitir subida a usuarios autenticados" on storage.objects;

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Rendimiento: índices de cobertura para FKs sin índice (linter 0001)
-- ──────────────────────────────────────────────────────────────────────────
create index if not exists idx_company_manuals_created_by      on public.company_manuals (created_by);
create index if not exists idx_company_manuals_current_version on public.company_manuals (current_version_id);
create index if not exists idx_manual_ack_profile              on public.manual_acknowledgments (profile_id);
create index if not exists idx_manual_versions_uploaded_by     on public.manual_versions (uploaded_by);
create index if not exists idx_notifications_actor             on public.notifications (actor_id);

-- ──────────────────────────────────────────────────────────────────────────
-- 4. Rendimiento RLS (linter 0003): envolver auth.uid() en (select ...) para
--    que se evalúe una vez por consulta y no por fila
-- ──────────────────────────────────────────────────────────────────────────
alter policy notifications_select on public.notifications
  using (profile_id = (select auth.uid()));
alter policy notifications_update on public.notifications
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
alter policy notifications_delete on public.notifications
  using (profile_id = (select auth.uid()));
alter policy manual_ack_insert on public.manual_acknowledgments
  with check ((organization_id = private.user_org_id()) and (profile_id = (select auth.uid())));
alter policy manual_ack_delete on public.manual_acknowledgments
  using ((organization_id = private.user_org_id()) and (profile_id = (select auth.uid())));
