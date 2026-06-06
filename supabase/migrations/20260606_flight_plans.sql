-- Migración: Planes de vuelo guardados
-- Permite registrar una planeación desde /dashboard/plan-vuelo y seleccionarla
-- luego en el despacho de vuelo (/dashboard/logbook/new).

CREATE TABLE IF NOT EXISTS flight_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  geo_type        TEXT,
  points          JSONB DEFAULT '[]'::jsonb,
  radius          NUMERIC,
  altitude        INTEGER,
  flight_date     DATE,
  takeoff_time    TIME,
  location        TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flight_plans_org ON flight_plans(organization_id, status);

ALTER TABLE flight_plans ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier miembro de la organización
CREATE POLICY "flight_plans_select"
ON flight_plans FOR SELECT TO authenticated
USING (
  organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Inserción: miembros de la organización (la creación efectiva pasa por API con service role)
CREATE POLICY "flight_plans_insert"
ON flight_plans FOR INSERT TO authenticated
WITH CHECK (
  organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Borrado: miembros de la organización
CREATE POLICY "flight_plans_delete"
ON flight_plans FOR DELETE TO authenticated
USING (
  organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);
