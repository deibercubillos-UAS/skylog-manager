-- Los componentes estándar ORIGINALES (los que vienen con la aeronave, sin un
-- mantenimiento asociado) deben reflejar la VIDA COMPLETA de la aeronave:
--   horas de uso = aircraft.total_hours   → base de odómetro = 0
--   días de uso  = desde el alta          → installed_at = aircraft.created_at
--
-- Los componentes creados por un mantenimiento (reemplazos/instalaciones) NO se tocan:
-- conservan su snapshot para que su contador arranque en cero desde el cambio.

-- 1) Corregir los componentes originales ya existentes (backfill previo)
UPDATE public.aircraft_components ac
SET installed_at_aircraft_hours = 0,
    installed_at = COALESCE(a.created_at, ac.installed_at)
FROM public.aircraft a
WHERE ac.aircraft_id = a.id
  AND ac.status = 'activo'
  AND ac.maintenance_log_id IS NULL;

-- 2) Trigger: las altas futuras siembran con base de odómetro = 0
CREATE OR REPLACE FUNCTION public.seed_standard_components()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.aircraft_components
    (organization_id, aircraft_id, component_type, installed_at, installed_at_aircraft_hours)
  VALUES
    (NEW.organization_id, NEW.id, 'Hélices', COALESCE(NEW.created_at, now()), 0),
    (NEW.organization_id, NEW.id, 'Motores', COALESCE(NEW.created_at, now()), 0),
    (NEW.organization_id, NEW.id, 'ESC',     COALESCE(NEW.created_at, now()), 0);
  RETURN NEW;
END;
$$;
