-- P9/P12 fixes: columnas updated_at + status 'purgado' en free_grants.

-- 1. updated_at en free_grants (cron lo usa para auditoría)
ALTER TABLE public.free_grants
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. updated_at en referral_commissions (Master lo usa al liquidar)
ALTER TABLE public.referral_commissions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3. Agregar 'purgado' al CHECK de free_grants.status
--    PostgreSQL requiere drop + re-create del constraint.
ALTER TABLE public.free_grants
  DROP CONSTRAINT IF EXISTS free_grants_status_check;

ALTER TABLE public.free_grants
  ADD CONSTRAINT free_grants_status_check
  CHECK (status IN ('enviado','activado','expirado','degradado','purgado'));
