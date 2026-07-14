-- 20260714_fk_profiles_set_null.sql
--
-- Corrige un bug real en producción: eliminar una cuenta desde
-- /admin/master (o self-service) fallaba con "Database error deleting user"
-- cuando esa cuenta había creado registros en tablas de trazabilidad/autoría.
--
-- Causa: 15 foreign keys hacia public.profiles tenían ON DELETE NO ACTION.
-- El borrado en cascada auth.users -> profiles se bloqueaba porque estas
-- filas históricas seguían referenciando el profile a eliminar.
--
-- Estas 15 columnas son todas de AUTORÍA/TRAZABILIDAD (created_by, updated_by,
-- scheduled_by, sent_by, granted_by) y todas son NULLABLE — la fila histórica
-- debe conservarse aunque su autor se elimine, solo perdiendo la referencia.
-- Por eso el cambio correcto es ON DELETE SET NULL (no CASCADE, que borraría
-- evidencia operativa/regulatoria, ni NO ACTION, que bloquea el borrado).
--
-- Idempotente: cada FK se elimina si existe y se recrea con la nueva regla.

DO $$
DECLARE
  fk RECORD;
  fks TEXT[][] := ARRAY[
    ['addon_subscriptions',           'addon_subscriptions_granted_by_fkey',            'granted_by'],
    ['aerocivil_monthly_reports',     'aerocivil_monthly_reports_sent_by_fkey',         'sent_by'],
    ['automation_jobs',               'automation_jobs_created_by_fkey',                'created_by'],
    ['flight_authorizations',         'flight_authorizations_scheduled_by_fkey',        'scheduled_by'],
    ['safety_hazards',                'safety_hazards_created_by_fkey',                 'created_by'],
    ['safety_indicator_submissions',  'safety_indicator_submissions_sent_by_fkey',      'sent_by'],
    ['safety_indicators',             'safety_indicators_created_by_fkey',              'created_by'],
    ['sms_gap_assessments',           'sms_gap_assessments_created_by_fkey',            'created_by'],
    ['sms_gap_questions',             'sms_gap_questions_created_by_fkey',              'created_by'],
    ['sms_training_attendance',       'sms_training_attendance_created_by_fkey',        'created_by'],
    ['sms_training_sessions',         'sms_training_sessions_created_by_fkey',          'created_by'],
    ['training_evaluations',          'training_evaluations_created_by_fkey',           'created_by'],
    ['training_exams',                'training_exams_updated_by_fkey',                 'updated_by'],
    ['training_programs',             'training_programs_updated_by_fkey',              'updated_by'],
    ['training_sessions',             'training_sessions_created_by_fkey',              'created_by']
  ];
BEGIN
  FOREACH fk SLICE 1 IN ARRAY fks LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', fk[1], fk[2]);
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.profiles(id) ON DELETE SET NULL',
      fk[1], fk[2], fk[3]
    );
  END LOOP;
END $$;
