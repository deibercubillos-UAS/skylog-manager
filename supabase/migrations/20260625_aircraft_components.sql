-- Vida útil por componente (horas + días), con reinicio individual al cambiarlo.
--
-- Las HORAS de cada componente se derivan del odómetro `aircraft.total_hours`:
--   horas_uso = aircraft.total_hours - installed_at_aircraft_hours   (componente activo)
-- Así no se escribe en cada vuelo; reutiliza el contador de horas de la aeronave.
-- El TIEMPO de uso (días) se deriva de `installed_at`.

CREATE TABLE IF NOT EXISTS public.aircraft_components (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  aircraft_id                 uuid NOT NULL REFERENCES public.aircraft(id) ON DELETE CASCADE,
  component_type              text NOT NULL,                 -- Hélices / Motores / ESC / personalizado
  name                        text,                          -- etiqueta para distinguir instancias (ej. "Motor #2")
  serial                      text,
  installed_at                timestamptz NOT NULL DEFAULT now(),
  installed_at_aircraft_hours double precision NOT NULL DEFAULT 0,  -- snapshot del odómetro al instalar
  status                      text NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'retirado')),
  retired_at                  timestamptz,
  retired_at_aircraft_hours   double precision,              -- horas congeladas al retirar
  maintenance_log_id          uuid REFERENCES public.maintenance_logs(id) ON DELETE SET NULL, -- mantenimiento que lo instaló
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aircraft_components_aircraft
  ON public.aircraft_components (aircraft_id, status);

-- RLS — mismo patrón que maintenance_logs
ALTER TABLE public.aircraft_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY aircraft_components_select ON public.aircraft_components
  FOR SELECT USING ((organization_id = private.user_org_id()) OR private.is_superadmin());

CREATE POLICY aircraft_components_insert ON public.aircraft_components
  FOR INSERT WITH CHECK ((organization_id = private.user_org_id()) AND private.can_manage_ops());

CREATE POLICY aircraft_components_update ON public.aircraft_components
  FOR UPDATE USING ((organization_id = private.user_org_id()) AND private.can_manage_ops())
  WITH CHECK ((organization_id = private.user_org_id()) AND private.can_manage_ops());

CREATE POLICY aircraft_components_delete ON public.aircraft_components
  FOR DELETE USING ((organization_id = private.user_org_id()) AND private.can_manage_ops());

-- ── Auto-siembra de componentes estándar al registrar una aeronave ──────────
-- Cubre TODOS los puntos de alta (fleet, DJI, onboarding, import) de forma atómica.
CREATE OR REPLACE FUNCTION public.seed_standard_components()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.aircraft_components
    (organization_id, aircraft_id, component_type, installed_at_aircraft_hours)
  VALUES
    (NEW.organization_id, NEW.id, 'Hélices', COALESCE(NEW.total_hours, 0)),
    (NEW.organization_id, NEW.id, 'Motores', COALESCE(NEW.total_hours, 0)),
    (NEW.organization_id, NEW.id, 'ESC',     COALESCE(NEW.total_hours, 0));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_standard_components ON public.aircraft;
CREATE TRIGGER trg_seed_standard_components
  AFTER INSERT ON public.aircraft
  FOR EACH ROW EXECUTE FUNCTION public.seed_standard_components();

-- ── Backfill: sembrar componentes estándar en la flota existente sin componentes ──
INSERT INTO public.aircraft_components
  (organization_id, aircraft_id, component_type, installed_at_aircraft_hours)
SELECT a.organization_id, a.id, c.ctype, COALESCE(a.total_hours, 0)
FROM public.aircraft a
CROSS JOIN (VALUES ('Hélices'), ('Motores'), ('ESC')) AS c(ctype)
WHERE NOT EXISTS (
  SELECT 1 FROM public.aircraft_components ac WHERE ac.aircraft_id = a.id
);
