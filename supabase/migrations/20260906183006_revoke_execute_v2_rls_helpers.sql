-- Revoca EXECUTE público sobre los helpers de RLS de v2 — mismo patrón ya usado en
-- producción (funciones private.* con EXECUTE revocado a PUBLIC/anon/authenticated).
-- Sin esto, cualquiera podía invocarlas directo vía /rest/v1/rpc/... (advisor de
-- seguridad tras la migración anterior). Las políticas RLS las siguen usando
-- internamente sin problema — revocar EXECUTE no afecta su uso dentro de una política.

revoke execute on function v2_current_organization_ids() from public, anon, authenticated;
revoke execute on function v2_current_person_id() from public, anon, authenticated;
revoke execute on function v2_is_duty_manager(uuid) from public, anon, authenticated;
