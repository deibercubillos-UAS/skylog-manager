-- Skylog V2.0 — SMS/Gobernanza: compromisos de la política de seguridad operacional.
-- Cada versión de la política (sms_policies) lleva, junto a su párrafo principal (policy_text),
-- una lista de compromisos (p. ej. «proveer los recursos necesarios», «Cultura Justa: no se
-- sanciona el reporte voluntario»…). Se versiona con la política: migración aditiva, sin RLS
-- nueva (hereda la de sms_policies).
alter table sms_policies add column if not exists commitments text[] not null default '{}';
