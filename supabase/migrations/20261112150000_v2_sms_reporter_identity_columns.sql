-- Auditoría de seguridad 2026-11-12 — identidad del notificante confidencial legible por PostgREST.
-- `sms_reports_select` deja pasar la FILA a cualquier gestor (`v2_is_duty_manager`: GG, JP, Gerente SMS) y la
-- redacción de `reported_by` / `reporter_contact` de un reporte 'confidencial' vivía solo en la API
-- (`redactReporterIdentity`). Con su JWT y la llave anon pública, un Jefe de Pilotos o el Gerente General podía pedir
-- `GET /rest/v1/sms_reports?select=reported_by,reporter_contact` y leer quién reportó (RAC 219 §219.115-140, regla S4).
--
-- Se usan privilegios por columna (RLS no filtra columnas): `authenticated` conserva el SELECT de todas las columnas
-- MENOS `reported_by` y `reporter_contact`; `anon` no lee la tabla. La política RLS sigue evaluando `reported_by`
-- (las políticas no exigen privilegio de columna al usuario; verificado en producción con una transacción revertida)
-- y el servidor lee la identidad con la llave de servicio sobre filas que la sesión ya pudo ver (src/lib/v2/smsReporterIdentity.js).
-- Contrapartida: `select=*` y los filtros/joins por `reported_by` con la sesión del usuario dan «permission denied»;
-- por eso esta migración se aplica DESPUÉS de desplegar el código que lista columnas explícitas.
-- Una columna nueva de `sms_reports` no será legible por `authenticated` hasta que se le conceda su SELECT.
-- Reversible: `grant select on public.sms_reports to authenticated, anon;`

revoke select on table public.sms_reports from authenticated, anon;

grant select (
  id, organization_id, severity, route, requires_manager_analysis, event_code, event_label, description,
  confidentiality_level, source, analyzed_by, analyzed_at, filed_at, iris_reference, created_at, occurred_at,
  location, aircraft_id, flight_id
) on table public.sms_reports to authenticated;
