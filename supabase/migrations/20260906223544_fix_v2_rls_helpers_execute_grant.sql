-- Corrige la migración revoke_execute_v2_rls_helpers (decisión 35, 51-bitacora.md):
-- revocar EXECUTE de `authenticated` no solo bloqueaba el RPC público — también
-- rompía las políticas RLS de `memberships`/`people`/`organizations`/`duty_*`/
-- `flights`, que INVOCAN estas funciones internamente. Postgres exige EXECUTE
-- para el rol que dispara la política (aunque la función sea SECURITY DEFINER),
-- así que cualquier usuario autenticado normal recibía
-- "permission denied for function v2_current_organization_ids" (42501) al
-- intentar leer sus propias memberships — encontrado probando la UI real de
-- F5 con un usuario de prueba (2026-09-06).
--
-- Verificado que esto es seguro: las 3 funciones están auto-acotadas por
-- auth.uid() — un usuario autenticado que las invocara directo por RPC solo
-- vería sus propias organizaciones/persona/rol, nunca datos de otro. El
-- `anon` (sin sesión) sigue sin poder ejecutarlas — esa parte de la migración
-- original queda intacta.

grant execute on function v2_current_organization_ids() to authenticated;
grant execute on function v2_current_person_id() to authenticated;
grant execute on function v2_is_duty_manager(uuid) to authenticated;
