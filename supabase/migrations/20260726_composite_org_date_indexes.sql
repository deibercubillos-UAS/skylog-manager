-- Índices compuestos (organization_id, columna_de_fecha) para las tablas que
-- los endpoints /api/reports/* (y algunos endpoints de dashboard) filtran
-- realmente con ese patrón — confirmado leyendo cada route.js (no supuesto),
-- y contrastado contra los índices reales ya existentes en producción vía
-- Supabase MCP (`list_tables` + `pg_indexes`) antes de escribir este archivo.
--
-- ⚠️ NO aplicada todavía — solo agrega el archivo .sql al repo. Aplicarla a la
-- base de datos en producción es un paso manual separado (Supabase MCP,
-- `apply_migration`), a revisar por el usuario antes de ejecutarla contra una
-- base con pagos reales.
--
-- Tablas revisadas y YA cubiertas por un índice compuesto existente (no se
-- tocan aquí): `flights` → idx_flights_org_date (organization_id,
-- flight_date DESC); `flight_authorizations` → idx_flight_auth_org_scheduled
-- (organization_id, scheduled_at DESC); `sms_reports` → idx_sms_org_created
-- (organization_id, created_at DESC); `audit_log` → idx_audit_log_org_created
-- (organization_id, created_at DESC); `vor_mor_submissions` → ya tiene
-- (organization_id, type, created_at DESC), suficiente para el listado por
-- tipo — el filtro por rango en `occurrence_date` de
-- GET /api/reports/vor-mor-list es secundario sobre un conjunto ya acotado
-- por organization_id vía el índice simple existente, no se duplica.
--
-- Tablas SIN índice compuesto que sí filtran por (organization_id, fecha) o
-- (organization_id, tipo) en consultas reales — cubiertas por este archivo:
--
--  1. maintenance_logs (organization_id, maintenance_date)
--     GET /api/reports/maintenance — src/app/api/reports/maintenance/route.js:30-37
--       .eq('organization_id', orgId).gte('maintenance_date', from).lte('maintenance_date', to)
--     Único índice hoy sobre organization_id es (organization_id, created_at DESC),
--     que no ayuda a un filtro por maintenance_date.
--
--  2. training_evaluations (organization_id, type, evaluation_date)
--     GET /api/reports/training — src/app/api/reports/training/route.js:32-38
--       .eq('organization_id', orgId).eq('type', type).order('evaluation_date')
--       .gte('evaluation_date', from).lte('evaluation_date', to)
--     Esta tabla no tiene NINGÚN índice hoy fuera de la PK — el caso de mayor
--     impacto de este archivo.
--
--  3. supplier_audits (organization_id, audit_date)
--     GET /api/reports/suppliers — src/app/api/reports/suppliers/route.js:31-38
--       .eq('organization_id', orgId).gte('audit_date', from).lte('audit_date', to)
--     Hoy solo hay índice simple en organization_id (idx_supplier_audits_org).
--
--  4. sms_gap_assessments (organization_id, assessment_date)
--     GET /api/reports/gap-history — src/app/api/reports/gap-history/route.js:21-25
--       .eq('organization_id', orgId).order('assessment_date', { ascending: true })
--     Hoy solo hay índice simple en organization_id (idx_sms_gap_assessments_org).
--
--  5. training_sessions (organization_id, type)
--     GET /api/reports/training-schedule — src/app/api/reports/training-schedule/route.js:35-39
--       .eq('organization_id', orgId).eq('type', type)
--     No es un filtro por fecha (la tabla solo guarda la definición recurrente,
--     las ocurrencias se proyectan en memoria — ver lib/trainingCompliance.js),
--     pero es el mismo patrón "organization_id + columna muy selectiva" y la
--     tabla no tiene NINGÚN índice fuera de la PK.

CREATE INDEX IF NOT EXISTS idx_maintenance_logs_org_date
  ON public.maintenance_logs USING btree (organization_id, maintenance_date);

CREATE INDEX IF NOT EXISTS idx_training_evaluations_org_type_date
  ON public.training_evaluations USING btree (organization_id, type, evaluation_date);

CREATE INDEX IF NOT EXISTS idx_supplier_audits_org_date
  ON public.supplier_audits USING btree (organization_id, audit_date);

CREATE INDEX IF NOT EXISTS idx_sms_gap_assessments_org_date
  ON public.sms_gap_assessments USING btree (organization_id, assessment_date);

CREATE INDEX IF NOT EXISTS idx_training_sessions_org_type
  ON public.training_sessions USING btree (organization_id, type);
