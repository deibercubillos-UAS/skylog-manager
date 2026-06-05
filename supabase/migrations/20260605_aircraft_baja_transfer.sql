-- Migración: Dar de baja y transferencia de aeronaves
-- Agrega columnas para gestión del ciclo de vida de aeronaves

ALTER TABLE aircraft
  ADD COLUMN IF NOT EXISTS baja_date DATE,
  ADD COLUMN IF NOT EXISTS baja_reason TEXT,
  ADD COLUMN IF NOT EXISTS transferred_to_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ;

-- Comentarios descriptivos
COMMENT ON COLUMN aircraft.baja_date IS 'Fecha en que la aeronave fue dada de baja';
COMMENT ON COLUMN aircraft.baja_reason IS 'Motivo de la baja (texto libre, opcional)';
COMMENT ON COLUMN aircraft.transferred_to_org_id IS 'ID de la organización destino en caso de transferencia';
COMMENT ON COLUMN aircraft.transferred_at IS 'Timestamp de la transferencia';
