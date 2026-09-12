-- sms_reports es clase ④ evento — no se reescribe el contenido, pero SÍ hace
-- falta poder marcar analyzed_by/analyzed_at (filtraje MOR, 12-directivas-maut.md
-- §2.1) y filed_at (radicación) sin abrir una política de UPDATE general.
-- Mismo criterio que duty_periods_update_close_only (F5): gestores de la
-- organización, sin restringir columnas a nivel de RLS (Postgres RLS no
-- restringe columnas) — la restricción de qué campos se tocan vive en la API.
create policy sms_reports_update_analysis on sms_reports
  for update using (v2_is_duty_manager(organization_id))
  with check (v2_is_duty_manager(organization_id));
