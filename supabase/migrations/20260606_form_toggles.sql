-- Migración: Activar/desactivar protocolos pre-vuelo y briefing
-- Igual que enable_health_check, permite a la org saltar estos pasos en el flujo de vuelo.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS enable_preflight BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_briefing  BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN organizations.enable_preflight IS
  'Si está activo, el flujo de nuevo vuelo exige la lista de chequeo pre-vuelo.';
COMMENT ON COLUMN organizations.enable_briefing IS
  'Si está activo, el flujo de nuevo vuelo exige el briefing de misión.';
