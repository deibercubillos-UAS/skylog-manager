-- Configuración editable de planes ePayco (editada desde /admin/master)
-- Una fila por combinación plan × billing (ej: piloto_monthly, flota_annual)
CREATE TABLE IF NOT EXISTS epayco_plan_config (
  id          TEXT PRIMARY KEY,        -- 'piloto_monthly', 'escuadrilla_annual', etc.
  plan_key    TEXT        NOT NULL,    -- 'piloto' | 'escuadrilla' | 'flota'
  billing     TEXT        NOT NULL,    -- 'monthly' | 'annual'
  epayco_id   TEXT        NOT NULL,    -- ID exacto en ePayco (ej: 'flota_anual')
  name        TEXT        NOT NULL,    -- Nombre visible en ePayco
  description TEXT,
  amount      INTEGER     NOT NULL,    -- Precio total COP (IVA incluido)
  trial_days  INTEGER     NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Solo superadmin puede modificar (RLS)
ALTER TABLE epayco_plan_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_all" ON epayco_plan_config
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  );

-- Lectura pública para que el app lea los precios actuales
CREATE POLICY "public_read" ON epayco_plan_config
  FOR SELECT USING (true);

-- Seed con los valores actuales
INSERT INTO epayco_plan_config (id, plan_key, billing, epayco_id, name, description, amount, trial_days) VALUES
  ('piloto_monthly',      'piloto',      'monthly', 'piloto_mensual',    'Bitafly Piloto Mensual',      'Suscripción mensual - Plan Piloto',      15000,    60),
  ('piloto_annual',       'piloto',      'annual',  'piloto_anual',      'Bitafly Piloto Anual',        'Suscripción anual - Plan Piloto (2 meses gratis)', 150000, 60),
  ('escuadrilla_monthly', 'escuadrilla', 'monthly', 'escuadrilla_mensual','Bitafly Escuadrilla Mensual','Suscripción mensual - Plan Escuadrilla', 59000,    0),
  ('escuadrilla_annual',  'escuadrilla', 'annual',  'Escuadrilla Anual', 'Bitafly Escuadrilla Anual',  'Suscripción anual - Plan Escuadrilla',   590000,   0),
  ('flota_monthly',       'flota',       'monthly', 'flota_mensual',     'Bitafly Flota Mensual',       'Suscripción mensual - Plan Flota',       159000,   0),
  ('flota_annual',        'flota',       'annual',  'flota_anual',       'Bitafly Flota Anual',         'Suscripción anual - Plan Flota',         1590000,  0)
ON CONFLICT (id) DO NOTHING;
