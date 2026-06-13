-- Función cron: evalúa aeronaves y cambia a en_mantenimiento si superan umbral
-- Se ejecuta diariamente a las 13:30 UTC (8:30 AM Colombia)
CREATE OR REPLACE FUNCTION public.check_aircraft_maintenance_due()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      a.id,
      a.organization_id,
      a.model,
      a.serial_number,
      a.total_hours,
      a.last_maintenance_hours,
      a.last_maintenance_date,
      a.maintenance_interval_hours,
      a.maintenance_interval_days,
      a.operational_status
    FROM public.aircraft a
    WHERE
      a.status IS DISTINCT FROM 'Baja'
      AND a.status IS DISTINCT FROM 'Transferido'
      AND a.operational_status = 'disponible'
      AND (
        (a.maintenance_interval_hours > 0 AND (a.total_hours - COALESCE(a.last_maintenance_hours, 0)) >= a.maintenance_interval_hours)
        OR
        (a.maintenance_interval_days > 0 AND a.last_maintenance_date IS NOT NULL
          AND (CURRENT_DATE - a.last_maintenance_date::date) >= a.maintenance_interval_days)
      )
  LOOP
    UPDATE public.aircraft
    SET
      operational_status = 'en_mantenimiento',
      last_status_change = NOW()
    WHERE id = rec.id;

    INSERT INTO public.notifications (
      organization_id, profile_id, type, title, body, link, metadata
    )
    SELECT
      p.organization_id,
      p.id,
      'maintenance_due',
      'Mantenimiento requerido: ' || rec.model,
      'La aeronave ' || COALESCE(rec.serial_number, rec.model) || ' ha superado el umbral de mantenimiento y se marcó como "En mantenimiento".',
      '/dashboard/fleet',
      jsonb_build_object('aircraft_id', rec.id)
    FROM public.profiles p
    WHERE
      p.organization_id = rec.organization_id
      AND p.role IN ('admin', 'jefe_pilotos', 'superadmin');

  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_aircraft_maintenance_due() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule(
  'check_aircraft_maintenance_due',
  '30 13 * * *',
  $$SELECT public.check_aircraft_maintenance_due();$$
);
