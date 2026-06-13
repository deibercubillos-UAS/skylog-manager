-- Configuración de mantenimiento por aeronave
ALTER TABLE public.aircraft
  ADD COLUMN IF NOT EXISTS maintenance_interval_hours  INT     DEFAULT 200,
  ADD COLUMN IF NOT EXISTS maintenance_interval_days   INT     DEFAULT 180,
  ADD COLUMN IF NOT EXISTS operational_status          TEXT    NOT NULL DEFAULT 'disponible'
    CHECK (operational_status IN ('disponible', 'en_mantenimiento')),
  ADD COLUMN IF NOT EXISTS last_status_change          TIMESTAMPTZ;

-- Índice para el guard de despacho (filtra por org + estado)
CREATE INDEX IF NOT EXISTS idx_aircraft_operational_status
  ON public.aircraft (organization_id, operational_status)
  WHERE operational_status = 'en_mantenimiento';
