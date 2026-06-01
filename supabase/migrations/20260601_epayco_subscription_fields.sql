-- Agrega campos de ePayco a la tabla profiles
-- Reemplaza wompi_subscription_ref por campos ePayco

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS epayco_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS epayco_ref              TEXT;

-- Índice para búsqueda rápida por subscription_id
CREATE INDEX IF NOT EXISTS idx_profiles_epayco_subscription_id
  ON profiles (epayco_subscription_id)
  WHERE epayco_subscription_id IS NOT NULL;
