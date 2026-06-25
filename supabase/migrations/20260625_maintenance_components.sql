-- Fase B — Trazabilidad de componentes
--
-- Registro de cambios de componentes durante un mantenimiento. Tabla dedicada
-- (no JSONB) porque la trazabilidad debe ser consultable por aeronave/componente/fecha.
-- Las filas solo existen cuando hay un cambio real → sigue siendo eficiente en espacio.

CREATE TABLE IF NOT EXISTS public.maintenance_components (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  maintenance_log_id uuid NOT NULL REFERENCES public.maintenance_logs(id) ON DELETE CASCADE,
  aircraft_id        uuid REFERENCES public.aircraft(id) ON DELETE CASCADE,  -- denormalizado para consulta directa
  component_type     text NOT NULL,
  action             text NOT NULL CHECK (action IN ('instalado', 'removido', 'reemplazado')),
  part_old           text,
  part_new           text,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Índices: histórico por aeronave + lookup por mantenimiento
CREATE INDEX IF NOT EXISTS idx_maintenance_components_aircraft
  ON public.maintenance_components (aircraft_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_components_log
  ON public.maintenance_components (maintenance_log_id);

-- RLS — mismo patrón que maintenance_logs
ALTER TABLE public.maintenance_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY maintenance_components_select ON public.maintenance_components
  FOR SELECT USING ((organization_id = private.user_org_id()) OR private.is_superadmin());

CREATE POLICY maintenance_components_insert ON public.maintenance_components
  FOR INSERT WITH CHECK ((organization_id = private.user_org_id()) AND private.can_manage_ops());

CREATE POLICY maintenance_components_update ON public.maintenance_components
  FOR UPDATE USING ((organization_id = private.user_org_id()) AND private.can_manage_ops())
  WITH CHECK ((organization_id = private.user_org_id()) AND private.can_manage_ops());

CREATE POLICY maintenance_components_delete ON public.maintenance_components
  FOR DELETE USING ((organization_id = private.user_org_id()) AND private.can_manage_ops());
