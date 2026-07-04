-- Capacitación: programa de entrenamiento personalizable (Operaciones y
-- Mantenimiento) + evaluaciones internas por tripulante, ligadas al
-- expediente del piloto. Ver CLAUDE.md "Capacitación".

CREATE TABLE IF NOT EXISTS training_programs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  type text NOT NULL CHECK (type IN ('operaciones', 'mantenimiento')),
  title text,
  description text,
  topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_by uuid REFERENCES profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, type)
);

CREATE TRIGGER training_programs_set_updated_at
  BEFORE UPDATE ON training_programs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY training_programs_select ON training_programs
  FOR SELECT USING (organization_id = private.user_org_id());

CREATE POLICY training_programs_insert ON training_programs
  FOR INSERT WITH CHECK (organization_id = private.user_org_id() AND private.user_is_manager());

CREATE POLICY training_programs_update ON training_programs
  FOR UPDATE USING (organization_id = private.user_org_id() AND private.user_is_manager())
  WITH CHECK (organization_id = private.user_org_id() AND private.user_is_manager());

CREATE TABLE IF NOT EXISTS training_evaluations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  pilot_id uuid NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('operaciones', 'mantenimiento')),
  evaluation_date date NOT NULL DEFAULT CURRENT_DATE,
  result text NOT NULL CHECK (result IN ('aprobado', 'no_aprobado')),
  evaluator_name text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE training_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY training_evaluations_select ON training_evaluations
  FOR SELECT USING (organization_id = private.user_org_id());

CREATE POLICY training_evaluations_insert ON training_evaluations
  FOR INSERT WITH CHECK (organization_id = private.user_org_id() AND private.user_is_manager());

CREATE POLICY training_evaluations_update ON training_evaluations
  FOR UPDATE USING (organization_id = private.user_org_id() AND private.user_is_manager())
  WITH CHECK (organization_id = private.user_org_id() AND private.user_is_manager());

CREATE POLICY training_evaluations_delete ON training_evaluations
  FOR DELETE USING (organization_id = private.user_org_id() AND private.user_is_manager());
