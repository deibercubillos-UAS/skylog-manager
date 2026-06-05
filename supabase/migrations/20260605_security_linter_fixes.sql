-- ══════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Corrección de advertencias de seguridad Supabase Linter
-- Fecha: 2026-06-05
-- ══════════════════════════════════════════════════════════════════

-- 1. ERROR: RLS deshabilitado en processed_webhook_refs
--    Solo el service_role escribe aquí (idempotencia del webhook).
ALTER TABLE public.processed_webhook_refs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_client_access" ON public.processed_webhook_refs
  AS RESTRICTIVE
  TO anon, authenticated
  USING (false);

-- 2. WARN: Function search_path mutable — set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- 3. WARN: Function search_path mutable — increment_aircraft_hours
CREATE OR REPLACE FUNCTION public.increment_aircraft_hours(p_id uuid, p_hours numeric)
  RETURNS void
  LANGUAGE sql
  SET search_path = public
AS $$
  UPDATE aircraft SET total_hours = COALESCE(total_hours, 0) + p_hours WHERE id = p_id;
$$;

-- 4. WARN: Function search_path mutable + SECURITY DEFINER expuesto
--    cleanup_expired_replays — fijar search_path y revocar ejecución de roles cliente
CREATE OR REPLACE FUNCTION public.cleanup_expired_replays()
  RETURNS TABLE(org_id uuid, flight_id uuid, replay_path text)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH plan_retention AS (
    SELECT DISTINCT ON (p.organization_id)
      p.organization_id,
      p.subscription_plan,
      cfg.replay_retention_days
    FROM profiles p
    JOIN epayco_plan_config cfg
      ON cfg.plan_key = p.subscription_plan
     AND cfg.billing  = 'monthly'
    WHERE cfg.replay_retention_days > 0
    ORDER BY p.organization_id
  ),
  expired AS (
    SELECT
      f.organization_id AS org_id,
      f.id              AS flight_id,
      f.replay_path
    FROM flights f
    JOIN plan_retention pr ON pr.organization_id = f.organization_id
    WHERE f.replay_path IS NOT NULL
      AND f.flight_date < (CURRENT_DATE - pr.replay_retention_days * INTERVAL '1 day')
  )
  UPDATE flights
    SET replay_path = NULL
  FROM expired
  WHERE flights.id = expired.flight_id
  RETURNING expired.org_id, expired.flight_id, expired.replay_path;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_replays() FROM anon, authenticated;

-- 5. WARN: RLS policy always true — vor_mor_submissions INSERT
--    Reemplaza WITH CHECK (true) por validación de organización existente.
DROP POLICY IF EXISTS "public insert submission" ON public.vor_mor_submissions;

CREATE POLICY "public insert submission" ON public.vor_mor_submissions
  FOR INSERT
  WITH CHECK (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organizations WHERE id = organization_id
    )
  );

-- 6. INFO: RLS habilitado sin políticas — emergency_contacts
CREATE POLICY "org_members_manage_emergency_contacts" ON public.emergency_contacts
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 7. INFO: RLS habilitado sin políticas — epayco_plan_config
--    Lectura pública (precios en landing). Escritura solo vía service_role.
CREATE POLICY "public_read_plan_config" ON public.epayco_plan_config
  FOR SELECT
  USING (true);

-- 8. INFO: RLS habilitado sin políticas — pending_registrations (service_role only)
CREATE POLICY "deny_client_access" ON public.pending_registrations
  AS RESTRICTIVE
  TO anon, authenticated
  USING (false);

-- 9. INFO: RLS habilitado sin políticas — pending_subscriptions (service_role only)
CREATE POLICY "deny_client_access" ON public.pending_subscriptions
  AS RESTRICTIVE
  TO anon, authenticated
  USING (false);

-- 10. WARN: Extension pg_trgm en schema public → mover a extensions
--     Los índices GIN existentes siguen funcionando (referencia por OID).
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- ══════════════════════════════════════════════════════════════════
-- PENDIENTE (requiere dashboard Supabase):
--   auth_leaked_password_protection — Habilitar en:
--   Authentication > Settings > Password Strength > Enable leaked password protection
-- ══════════════════════════════════════════════════════════════════
