-- =============================================================================
-- BITAFLY — ÍNDICES DE RENDIMIENTO
-- Migración: 20260526_performance_indexes.sql
--
-- Ejecutar desde: Supabase Dashboard → SQL Editor
-- o con: supabase db push
--
-- Criterio de selección:
--   Solo se indexan columnas que aparecen en WHERE / ORDER BY de los
--   endpoints API más frecuentes. Los índices en columnas de baja
--   cardinalidad (status, role) se descartan deliberadamente.
-- =============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- TABLA: flights  (consulta más frecuente de la app)
-- ────────────────────────────────────────────────────────────────────────────
-- Logbook paginado: WHERE organization_id = ? ORDER BY flight_date DESC
CREATE INDEX IF NOT EXISTS idx_flights_org_date
  ON flights (organization_id, flight_date DESC);

-- Dashboard gráfico mensual: WHERE organization_id = ? AND flight_date >= ?
CREATE INDEX IF NOT EXISTS idx_flights_org_date_asc
  ON flights (organization_id, flight_date);

-- Dashboard actividad reciente: WHERE organization_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_flights_org_created
  ON flights (organization_id, created_at DESC);

-- Auditoría — vuelos sin aterrizaje: WHERE organization_id = ? AND landing_time IS NULL
CREATE INDEX IF NOT EXISTS idx_flights_org_landing
  ON flights (organization_id, landing_time)
  WHERE landing_time IS NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- TABLA: aircraft
-- ────────────────────────────────────────────────────────────────────────────
-- Fleet GET: WHERE organization_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_aircraft_org_created
  ON aircraft (organization_id, created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- TABLA: pilots
-- ────────────────────────────────────────────────────────────────────────────
-- Pilots GET: WHERE organization_id = ? AND is_active = true ORDER BY name
CREATE INDEX IF NOT EXISTS idx_pilots_org_active_name
  ON pilots (organization_id, name)
  WHERE is_active = true;

-- ────────────────────────────────────────────────────────────────────────────
-- TABLA: maintenance_logs
-- ────────────────────────────────────────────────────────────────────────────
-- Maintenance GET: WHERE organization_id = ? ORDER BY created_at DESC LIMIT 200
CREATE INDEX IF NOT EXISTS idx_maintenance_org_created
  ON maintenance_logs (organization_id, created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- TABLA: flight_authorizations
-- ────────────────────────────────────────────────────────────────────────────
-- Authorize GET: WHERE organization_id = ? AND status NOT IN (...) ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_authorize_org_created
  ON flight_authorizations (organization_id, created_at DESC);

-- Lookup de número de misión (para generar nextNumber):
-- WHERE organization_id = ? ORDER BY created_at DESC LIMIT 1
-- (cubierto por idx_authorize_org_created)

-- ────────────────────────────────────────────────────────────────────────────
-- TABLA: sora_assessments
-- ────────────────────────────────────────────────────────────────────────────
-- SORA GET: WHERE organization_id = ? ORDER BY created_at DESC LIMIT 50
CREATE INDEX IF NOT EXISTS idx_sora_org_created
  ON sora_assessments (organization_id, created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- TABLA: sms_reports
-- ────────────────────────────────────────────────────────────────────────────
-- SMS GET: WHERE organization_id = ? ORDER BY created_at DESC LIMIT 200
CREATE INDEX IF NOT EXISTS idx_sms_org_created
  ON sms_reports (organization_id, created_at DESC);

-- Reports SMS con fechas: WHERE organization_id = ? AND created_at BETWEEN ...
CREATE INDEX IF NOT EXISTS idx_sms_org_date
  ON sms_reports (organization_id, created_at);

-- ────────────────────────────────────────────────────────────────────────────
-- TABLA: profiles
-- ────────────────────────────────────────────────────────────────────────────
-- getOrgContext y admin/users: WHERE id = ? (ya existe PK) + WHERE organization_id = ?
CREATE INDEX IF NOT EXISTS idx_profiles_org
  ON profiles (organization_id);

-- ────────────────────────────────────────────────────────────────────────────
-- TABLA: form_records
-- ────────────────────────────────────────────────────────────────────────────
-- Records por template: WHERE owner_id = ? AND template_id = ?
CREATE INDEX IF NOT EXISTS idx_form_records_owner_template
  ON form_records (owner_id, template_id);

-- ────────────────────────────────────────────────────────────────────────────
-- TABLA: battery_logs
-- ────────────────────────────────────────────────────────────────────────────
-- Battery logs por organización: WHERE organization_id = ?
CREATE INDEX IF NOT EXISTS idx_battery_logs_org
  ON battery_logs (organization_id, created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- TABLA: invitations
-- ────────────────────────────────────────────────────────────────────────────
-- Lookup de invitaciones por email (registro con código de org):
CREATE INDEX IF NOT EXISTS idx_invitations_email
  ON invitations (email);
