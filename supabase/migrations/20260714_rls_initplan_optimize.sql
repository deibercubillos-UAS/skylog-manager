-- 20260714_rls_initplan_optimize.sql
--
-- Optimización de rendimiento RLS (advisor auth_rls_initplan): 25 políticas
-- reevaluaban auth.uid()/auth.email()/private.*() UNA VEZ POR FILA. Envolverlas
-- en (SELECT ...) las convierte en InitPlan evaluado una sola vez por consulta.
--
-- ⚠️ CERO cambio semántico: solo cambia CUÁNDO se evalúa la función, no QUÉ
-- devuelve. Se usa ALTER POLICY (no DROP/CREATE) para que no haya ninguna
-- ventana en la que la política no exista. Las 25 son las tablas creadas
-- después de la optimización RLS de junio (plan de mejora SMS, training,
-- organization_members, etc.) — el resto del esquema ya estaba optimizado.
--
-- Estas políticas se dejan leyendo `profiles` directo (no organization_members)
-- a propósito: `profiles` refleja la organización ACTIVA de cada cuenta (via
-- switch-active), así que el resultado es correcto. Migrarlas a los helpers
-- private.* sería un cambio de comportamiento, fuera del alcance de un ajuste
-- de rendimiento.

-- ── Grupo A: manager check (org + rol superadmin/admin/gerente_sms), ALL ──
ALTER POLICY aerocivil_monthly_reports_all ON public.aerocivil_monthly_reports
  USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))))
  WITH CHECK (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))));

ALTER POLICY safety_barriers_all ON public.safety_barriers
  USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))))
  WITH CHECK (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))));

ALTER POLICY safety_hazards_all ON public.safety_hazards
  USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))))
  WITH CHECK (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))));

ALTER POLICY safety_indicator_actions_all ON public.safety_indicator_actions
  USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))))
  WITH CHECK (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))));

ALTER POLICY safety_indicator_monthly_all ON public.safety_indicator_monthly
  USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))))
  WITH CHECK (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))));

ALTER POLICY safety_indicator_submissions_all ON public.safety_indicator_submissions
  USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))))
  WITH CHECK (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))));

ALTER POLICY safety_indicators_all ON public.safety_indicators
  USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))))
  WITH CHECK (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))));

ALTER POLICY safety_risk_scales_all ON public.safety_risk_scales
  USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))))
  WITH CHECK (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))));

ALTER POLICY safety_risk_tolerability_all ON public.safety_risk_tolerability
  USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))))
  WITH CHECK (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))));

ALTER POLICY sms_case_actions_all ON public.sms_case_actions
  USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))))
  WITH CHECK (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))));

ALTER POLICY sms_gap_assessments_all ON public.sms_gap_assessments
  USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))))
  WITH CHECK (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))));

ALTER POLICY sms_gap_question_visibility_all ON public.sms_gap_question_visibility
  USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))))
  WITH CHECK (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))));

ALTER POLICY sms_gap_responses_all ON public.sms_gap_responses
  USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))))
  WITH CHECK (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))));

ALTER POLICY sms_training_attendance_all ON public.sms_training_attendance
  USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))))
  WITH CHECK (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))));

ALTER POLICY sms_training_sessions_all ON public.sms_training_sessions
  USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))))
  WITH CHECK (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))));

-- ── Grupo B: manager check, SELECT ──
ALTER POLICY sms_case_events_select ON public.sms_case_events
  USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text])))));

-- ── Grupo C: sms_gap_questions (quals propios) ──
ALTER POLICY sms_gap_questions_delete ON public.sms_gap_questions
  USING ((organization_id IS NOT NULL) AND (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text]))))));

ALTER POLICY sms_gap_questions_insert ON public.sms_gap_questions
  WITH CHECK ((organization_id IS NOT NULL) AND (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text]))))));

ALTER POLICY sms_gap_questions_update ON public.sms_gap_questions
  USING ((organization_id IS NOT NULL) AND (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text]))))))
  WITH CHECK ((organization_id IS NOT NULL) AND (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'gerente_sms'::text]))))));

ALTER POLICY sms_gap_questions_select ON public.sms_gap_questions
  USING ((organization_id IS NULL) OR (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE (profiles.id = (SELECT auth.uid())))));

-- ── Grupo D: app_releases superadmin (EXISTS) ──
ALTER POLICY superadmin_all ON public.app_releases
  USING (EXISTS (SELECT 1 FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = 'superadmin'::text))));

-- ── Grupo E: owner checks simples ──
ALTER POLICY billing_history_select_own ON public.billing_history
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY organization_members_select_own ON public.organization_members
  USING (user_id = (SELECT auth.uid()));

-- ── Grupo F: training_exam_attempts (private.* + auth.email) ──
ALTER POLICY training_exam_attempts_insert ON public.training_exam_attempts
  WITH CHECK ((organization_id = (SELECT private.user_org_id())) AND ((SELECT private.user_is_manager()) OR (pilot_id IN (SELECT pilots.id FROM pilots WHERE ((pilots.organization_id = (SELECT private.user_org_id())) AND ((pilots.profile_id = (SELECT auth.uid())) OR (pilots.owner_id = (SELECT auth.uid())) OR (pilots.email = (SELECT auth.email()))))))));

ALTER POLICY training_exam_attempts_select ON public.training_exam_attempts
  USING ((organization_id = (SELECT private.user_org_id())) AND ((SELECT private.user_is_manager()) OR (pilot_id IN (SELECT pilots.id FROM pilots WHERE ((pilots.organization_id = (SELECT private.user_org_id())) AND ((pilots.profile_id = (SELECT auth.uid())) OR (pilots.owner_id = (SELECT auth.uid())) OR (pilots.email = (SELECT auth.email()))))))));
