-- Agrega deactivated_at a pilots para rastrear cuándo fue dado de baja
-- y poder cortar el acceso al dashboard después de 30 días si no adquirió plan piloto.

ALTER TABLE pilots
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

-- Índice para el job nocturno y el chequeo en layout
CREATE INDEX IF NOT EXISTS idx_pilots_deactivated
  ON pilots (owner_id, is_active, deactivated_at)
  WHERE is_active = false AND deactivated_at IS NOT NULL;
