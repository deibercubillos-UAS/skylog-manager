-- Skylog V2.0 — Organización (página nueva). `organization_certifications`
-- necesita una fila por organización para poder hacer upsert por
-- organization_id — no existía ninguna restricción única (0 filas
-- verificado antes de esta migración). Sin política de UPDATE/INSERT
-- todavía en ninguna de las dos tablas — la escritura sigue pasando por
-- `createAdminClient()` (mismo patrón ya usado en el resto de V2), esto
-- solo habilita el upsert en sí.

alter table organization_certifications add constraint organization_certifications_organization_id_key unique (organization_id);
