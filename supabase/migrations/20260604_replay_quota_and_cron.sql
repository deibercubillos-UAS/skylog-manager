-- ── Fase 3: Replay de Vuelo — Cuotas por plan + limpieza automática ────────

-- 1. Columnas de cuota en epayco_plan_config
ALTER TABLE epayco_plan_config
  ADD COLUMN IF NOT EXISTS replay_retention_days INT NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS replay_max_flights    INT NOT NULL DEFAULT 10;

-- 2. Valores iniciales por plan
UPDATE epayco_plan_config SET replay_retention_days = 30,  replay_max_flights = 10  WHERE plan_key = 'piloto';
UPDATE epayco_plan_config SET replay_retention_days = 90,  replay_max_flights = 50  WHERE plan_key = 'escuadrilla';
UPDATE epayco_plan_config SET replay_retention_days = 180, replay_max_flights = 200 WHERE plan_key = 'flota';
-- enterprise: 0 = ilimitado (default = 30 hasta que se agregue el plan)

-- 3. Extensión pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 4. Función de limpieza de replays expirados
-- Pone replay_path = NULL en vuelos cuya fecha supera el período de retención.
-- El archivo en Storage se limpia por lazy cleanup en el GET del API,
-- o manualmente desde el panel de Supabase Storage.
CREATE OR REPLACE FUNCTION cleanup_expired_replays()
RETURNS TABLE(org_id uuid, flight_id uuid, replay_path text)
LANGUAGE plpgsql
SECURITY DEFINER
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
    WHERE cfg.replay_retention_days > 0  -- 0 = permanente, no limpiar
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

-- 5. Job cron: diariamente a las 03:00 UTC
SELECT cron.unschedule('cleanup-expired-replays')
FROM cron.job
WHERE jobname = 'cleanup-expired-replays';

SELECT cron.schedule(
  'cleanup-expired-replays',
  '0 3 * * *',
  $cron$SELECT cleanup_expired_replays()$cron$
);
