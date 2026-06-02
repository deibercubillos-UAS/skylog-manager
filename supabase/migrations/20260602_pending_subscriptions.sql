-- Tabla para guardar el intent de suscripción antes de redirigir a ePayco
-- El webhook la consulta para saber a qué usuario activar el plan
CREATE TABLE IF NOT EXISTS pending_subscriptions (
  reference   TEXT PRIMARY KEY,                   -- ID único que generamos (invoice)
  user_id     UUID NOT NULL,
  plan_key    TEXT NOT NULL,
  billing     TEXT NOT NULL,
  epayco_id   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '2 hours'
);

-- Limpia intents viejos automáticamente (PostgreSQL no tiene TTL nativo, se hace con cron o al leer)
CREATE INDEX IF NOT EXISTS idx_pending_subs_expires ON pending_subscriptions (expires_at);
