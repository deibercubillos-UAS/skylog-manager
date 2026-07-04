-- Catálogo de existencias de equipo (distinto de `inventory_items`, que es el
-- catálogo de Tech/Payloads de Flota con identidad por serial). Aquí cada fila
-- es un TIPO de equipo con una cantidad disponible en la empresa (ej. "Chalecos
-- de identificación: 5"), no una unidad física individual. Vive en la misma
-- página de Inventario de Operación (/dashboard/inventory-checklist), junto al
-- checklist de verificación — ver CLAUDE.md "Inventario de Operación".
--
-- RLS mismo patrón que company_manuals: lectura para todos los miembros de la
-- org, escritura solo managers (private.user_is_manager() = admin/superadmin/
-- gerente_sms/jefe_pilotos — coincide con canManageInventoryChecklist).

CREATE TABLE IF NOT EXISTS equipment_stock (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  category text,
  quantity integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE equipment_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY equipment_stock_select ON equipment_stock
  FOR SELECT USING (organization_id = private.user_org_id());

CREATE POLICY equipment_stock_insert ON equipment_stock
  FOR INSERT WITH CHECK (organization_id = private.user_org_id() AND private.user_is_manager());

CREATE POLICY equipment_stock_update ON equipment_stock
  FOR UPDATE USING (organization_id = private.user_org_id() AND private.user_is_manager())
  WITH CHECK (organization_id = private.user_org_id() AND private.user_is_manager());

CREATE POLICY equipment_stock_delete ON equipment_stock
  FOR DELETE USING (organization_id = private.user_org_id() AND private.user_is_manager());
