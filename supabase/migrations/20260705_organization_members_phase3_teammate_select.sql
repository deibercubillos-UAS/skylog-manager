-- Corrección encontrada durante la Fase 3 del refactor multi-organización:
-- organization_members solo tenía una política de auto-lectura
-- (user_id = auth.uid()), pero profiles sí permite leer perfiles de
-- compañeros de la misma org (organization_id = private.user_org_id()).
-- Sin el equivalente aquí, getOrgPlan() (que necesita leer la membresía del
-- ADMIN de la org, no necesariamente la propia) devolvería silenciosamente
-- el fallback para cualquier no-admin. Réplica exacta del mismo patrón de
-- profiles_select.
create policy organization_members_select_teammates on public.organization_members
  for select using (
    organization_id = private.user_org_id() or private.is_superadmin()
  );
