-- Fase 8: alertas DJI en bitácora
-- Añade columnas para registrar si el vuelo tuvo alertas detectadas al importar.

ALTER TABLE flights
  ADD COLUMN IF NOT EXISTS has_alerts  BOOLEAN  DEFAULT false,
  ADD COLUMN IF NOT EXISTS alerts_json JSONB    DEFAULT '[]'::jsonb;

-- Índice parcial para filtrar rápidamente vuelos con alertas
CREATE INDEX IF NOT EXISTS idx_flights_has_alerts
  ON flights (organization_id, has_alerts)
  WHERE has_alerts = true;

COMMENT ON COLUMN flights.has_alerts  IS 'true si el parser DJI detectó al menos una alerta durante el vuelo';
COMMENT ON COLUMN flights.alerts_json IS 'Array JSON de alertas: [{t, type, label, severity}]';
