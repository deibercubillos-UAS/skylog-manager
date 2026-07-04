-- Inventario de Operación: nueva pestaña de checklist de inventario a diligenciar
-- antes de cada misión, antes del checklist de Pre-vuelo. Mismo patrón que
-- Salud/Pre-vuelo/Briefing (form_definitions + results_<tipo>), gestionado por
-- Gerente General + Gerente SMS + Jefe de Pilotos (canManageInventoryChecklist),
-- diligenciado por cualquier rol que despache (canViewInventoryChecklist).
--
-- Default OFF (a diferencia de health/preflight/briefing, que ya default true):
-- es un tipo nuevo, no queremos que aparezca vacío en el despacho de orgs
-- existentes hasta que un manager lo active y cargue sus ítems.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS enable_inventory_checklist boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS results_inventory (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  flight_id uuid REFERENCES flights(id) ON DELETE CASCADE,
  checks jsonb,
  organization_id uuid REFERENCES organizations(id)
);

ALTER TABLE results_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON results_inventory
  FOR ALL
  USING (organization_id = private.get_my_org())
  WITH CHECK (organization_id = private.get_my_org());
