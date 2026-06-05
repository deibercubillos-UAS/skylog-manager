-- Tabla para registros pendientes de pago (pago antes de crear cuenta)
CREATE TABLE IF NOT EXISTS pending_registrations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT        NOT NULL,
  reference    TEXT        UNIQUE NOT NULL,
  plan_key     TEXT        NOT NULL,
  billing      TEXT        NOT NULL DEFAULT 'monthly',
  reg_data     JSONB       NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  expires_at   TIMESTAMPTZ DEFAULT NOW() + INTERVAL '3 hours',
  completed_at TIMESTAMPTZ,
  completed_user_id UUID
);

ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE pending_registrations IS 'Registros pendientes de pago. Expiración: 3 horas. Solo service_role puede leer.';
