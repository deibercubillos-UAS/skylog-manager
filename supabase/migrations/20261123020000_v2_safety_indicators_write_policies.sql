-- Skylog V2.0 — SPI: arreglo de RLS de escritura en safety_indicators.
-- Secuela del corte v1→v2: la única política PERMISSIVE que cubría UPDATE/DELETE era
-- `safety_indicators_all`, heredada de la v1, que apunta a `legacy_v1.profiles` (id = auth.uid()).
-- Para un usuario v2 nunca coincide, así que no había ninguna permisiva que habilitara la
-- escritura: solo quedaban las compuertas RESTRICTIVE (`*_rolegate`), que por sí solas no otorgan.
-- Efecto: editar o borrar un indicador devolvía 0 filas ("No se encontró el registro"). El INSERT
-- funcionaba porque tiene su propia permisiva (`safety_indicators_insert`).
-- Además esa política vieja era un sobre-permiso latente: un usuario migrado cuyo auth.uid() sí
-- exista en legacy_v1.profiles como admin/gerente_sms podía escribir por esa vía.
--
-- Arreglo: se elimina la política muerta y se agregan permisivas v2 de UPDATE y DELETE para
-- gestores (admin/gerente_sms/superadmin). Las compuertas RESTRICTIVE existentes siguen aplicando
-- en AND, así que el resultado neto es: solo gestores escriben.

drop policy if exists safety_indicators_all on safety_indicators;

create policy safety_indicators_update on safety_indicators
  for update
  using (v2_has_org_role(organization_id, '{admin,gerente_sms,superadmin}'))
  with check (v2_has_org_role(organization_id, '{admin,gerente_sms,superadmin}'));

create policy safety_indicators_delete on safety_indicators
  for delete
  using (v2_has_org_role(organization_id, '{admin,gerente_sms,superadmin}'));
