-- Skylog V2.0 — endurece los permisos de las funciones de 20261005010000 (hallazgo de get_advisors).
-- Solo branch `develop-v2` (regla O1).
--
-- v2_is_org_authority: la usan las políticas RLS, así que `authenticated` la conserva; `anon` no la necesita.
-- v2_flight_under_hold: solo la invocan triggers SECURITY DEFINER y el servidor (service role). Dejarla
-- ejecutable por cualquier usuario permitiría sondear por RPC qué vuelos de otra organización están en custodia.
revoke execute on function v2_is_org_authority(uuid) from public, anon;
grant execute on function v2_is_org_authority(uuid) to authenticated;
revoke execute on function v2_flight_under_hold(uuid) from public, anon, authenticated;
