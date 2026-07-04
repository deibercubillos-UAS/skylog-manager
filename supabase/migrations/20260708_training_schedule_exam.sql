-- Rediseño de Capacitación: cronograma de sesiones (tema + recurrencia) y motor
-- de examen real (banco de preguntas + intentos calificados automáticamente),
-- reemplazando la lista plana de "temas" y el registro manual de evaluaciones.
-- Ver CLAUDE.md "Capacitación".

-- ── Cronograma de sesiones ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  type text NOT NULL CHECK (type IN ('operaciones', 'mantenimiento')),
  topic text NOT NULL,
  recurrence text NOT NULL CHECK (recurrence IN ('semanal', 'quincenal', 'mensual', 'personalizado')),
  recurrence_days int,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER training_sessions_set_updated_at
  BEFORE UPDATE ON training_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY training_sessions_select ON training_sessions
  FOR SELECT USING (organization_id = private.user_org_id());
CREATE POLICY training_sessions_insert ON training_sessions
  FOR INSERT WITH CHECK (organization_id = private.user_org_id() AND private.user_is_manager());
CREATE POLICY training_sessions_update ON training_sessions
  FOR UPDATE USING (organization_id = private.user_org_id() AND private.user_is_manager())
  WITH CHECK (organization_id = private.user_org_id() AND private.user_is_manager());
CREATE POLICY training_sessions_delete ON training_sessions
  FOR DELETE USING (organization_id = private.user_org_id() AND private.user_is_manager());

-- ── Examen (config por tipo, recurrente) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_exams (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  type text NOT NULL CHECK (type IN ('operaciones', 'mantenimiento')),
  title text,
  recurrence text NOT NULL DEFAULT 'mensual' CHECK (recurrence IN ('semanal', 'quincenal', 'mensual', 'personalizado')),
  recurrence_days int,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  passing_score numeric NOT NULL DEFAULT 80,
  max_attempts int NOT NULL DEFAULT 3,
  updated_by uuid REFERENCES profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, type)
);

CREATE TRIGGER training_exams_set_updated_at
  BEFORE UPDATE ON training_exams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE training_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY training_exams_select ON training_exams
  FOR SELECT USING (organization_id = private.user_org_id());
CREATE POLICY training_exams_insert ON training_exams
  FOR INSERT WITH CHECK (organization_id = private.user_org_id() AND private.user_is_manager());
CREATE POLICY training_exams_update ON training_exams
  FOR UPDATE USING (organization_id = private.user_org_id() AND private.user_is_manager())
  WITH CHECK (organization_id = private.user_org_id() AND private.user_is_manager());

-- ── Banco de preguntas (opción múltiple, una correcta) ──────────────────────
CREATE TABLE IF NOT EXISTS training_exam_questions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  exam_id uuid NOT NULL REFERENCES training_exams(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_index int NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE training_exam_questions ENABLE ROW LEVEL SECURITY;

-- Lectura: managers ven todo (incluida la respuesta correcta, para editar).
-- Los pilotos NO deben ver correct_index — la ruta de examen resuelve las
-- preguntas server-side (API route) y nunca envía correct_index al cliente
-- mientras el piloto está respondiendo.
CREATE POLICY training_exam_questions_select ON training_exam_questions
  FOR SELECT USING (organization_id = private.user_org_id() AND private.user_is_manager());
CREATE POLICY training_exam_questions_insert ON training_exam_questions
  FOR INSERT WITH CHECK (organization_id = private.user_org_id() AND private.user_is_manager());
CREATE POLICY training_exam_questions_update ON training_exam_questions
  FOR UPDATE USING (organization_id = private.user_org_id() AND private.user_is_manager())
  WITH CHECK (organization_id = private.user_org_id() AND private.user_is_manager());
CREATE POLICY training_exam_questions_delete ON training_exam_questions
  FOR DELETE USING (organization_id = private.user_org_id() AND private.user_is_manager());

-- ── Intentos de examen por piloto ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_exam_attempts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  exam_id uuid NOT NULL REFERENCES training_exams(id) ON DELETE CASCADE,
  pilot_id uuid NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  cycle_start date NOT NULL,
  attempt_number int NOT NULL,
  answers jsonb,
  score numeric NOT NULL,
  passed boolean NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE training_exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY training_exam_attempts_select ON training_exam_attempts
  FOR SELECT USING (
    organization_id = private.user_org_id() AND (
      private.user_is_manager()
      OR pilot_id IN (
        SELECT id FROM pilots
        WHERE organization_id = private.user_org_id()
          AND (profile_id = auth.uid() OR owner_id = auth.uid() OR email = auth.email())
      )
    )
  );

CREATE POLICY training_exam_attempts_insert ON training_exam_attempts
  FOR INSERT WITH CHECK (
    organization_id = private.user_org_id() AND (
      private.user_is_manager()
      OR pilot_id IN (
        SELECT id FROM pilots
        WHERE organization_id = private.user_org_id()
          AND (profile_id = auth.uid() OR owner_id = auth.uid() OR email = auth.email())
      )
    )
  );
