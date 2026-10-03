-- Cierra el hallazgo de la auditoría del 2026-10-02 sobre
-- `sms_reports_update_analysis` (migración 20260906232419).
--
-- EL PROBLEMA
-- Esa política abrió UPDATE a cualquier `v2_is_duty_manager` — que incluye
-- admin, jefe_pilotos, gerente_sms y superadmin — sin restringir columnas, y
-- su propio comentario lo justificaba así: "Postgres RLS no restringe
-- columnas — la restricción de qué campos se tocan vive en la API".
--
-- La API no es el límite. Los clientes hablan directo con PostgREST usando su
-- propio JWT y la anon key, que es pública por diseño: RLS es la única
-- frontera real. Un Jefe de Pilotos podía hacer
--   PATCH /rest/v1/sms_reports?id=eq.X  { "confidentiality_level": "normal" }
-- y el siguiente SELECT dejaba de redactar la identidad del notificante
-- (redactReporterIdentity, packages/domain/src/smsReporterConfidentiality.js).
-- Eso derrota SMS-H y es incumplimiento de RAC 219 §219.115-140 — protección
-- de la información de seguridad operacional. Con la misma política podía
-- además reescribir `description`/`severity`, que son evidencia histórica
-- (la tabla es clase ④ evento: la migración original NO tenía UPDATE a
-- propósito, "corregir un reporte es un caso/evento nuevo").
--
-- LA SOLUCIÓN
-- RLS efectivamente no restringe columnas, pero los **privilegios por
-- columna** de Postgres sí, y son el mecanismo nativo para esto. La política
-- de RLS se conserva tal cual (sigue decidiendo correctamente QUÉ FILAS puede
-- tocar un gestor, acotadas a su organización); lo que se acota aquí es QUÉ
-- COLUMNAS.
--
-- Verificado antes de aplicar: los únicos escritores de `sms_reports` vía rol
-- `authenticated` son `api/sms/reports/analyze` (analyzed_by + analyzed_at) y
-- `api/sms/reports/file` (filed_at), ambos con createClientSSR(). Ningún otro
-- código de V2 ni de v1 hace UPDATE a esta tabla, así que revocar el UPDATE
-- amplio no rompe ninguna función existente.
--
-- `service_role` conserva UPDATE completo y no se ve afectado: es la vía
-- controlada (server-side, detrás de un gate de permiso en la aplicación),
-- mismo criterio que el resto del proyecto.

revoke update on sms_reports from authenticated, anon;

grant update (analyzed_by, analyzed_at, filed_at) on sms_reports to authenticated;

comment on policy sms_reports_update_analysis on sms_reports is
  'Acota QUÉ FILAS puede marcar un gestor (su organización). QUÉ COLUMNAS lo acotan los privilegios por columna de la migración 20261002000000: solo analyzed_by/analyzed_at/filed_at. NO confiar en la API como límite — los clientes llegan a PostgREST directo con su JWT.';
