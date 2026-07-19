-- 20260714_consolidate_org_members_select.sql
--
-- Advisor multiple_permissive_policies: organization_members tenía DOS políticas
-- permisivas de SELECT (_select_own + _select_teammates). Postgres evalúa TODAS
-- las permisivas de un rol/acción y las combina con OR, así que en una tabla
-- caliente (la lee getOrgContext en 113 rutas) esto duplica el trabajo por fila.
--
-- Se fusionan en UNA sola política SELECT con el mismo OR — semánticamente
-- idéntico (permisivas ya se OR-ean entre sí). De paso se envuelven los helpers
-- private.* en (SELECT ...) para el mismo beneficio InitPlan del resto de la
-- Etapa 2. Atómico dentro de la migración (transacción DDL): ninguna consulta
-- externa ve un estado intermedio sin política.

DROP POLICY IF EXISTS organization_members_select_own ON public.organization_members;
DROP POLICY IF EXISTS organization_members_select_teammates ON public.organization_members;

CREATE POLICY organization_members_select ON public.organization_members
  FOR SELECT
  USING (
    (user_id = (SELECT auth.uid()))
    OR (organization_id = (SELECT private.user_org_id()))
    OR (SELECT private.is_superadmin())
  );
