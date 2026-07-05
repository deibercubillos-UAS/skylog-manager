-- Permite relacionar (opcionalmente) un ítem del checklist de Inventario de
-- Operación con un equipo real de Existencias (equipment_stock) — solo
-- informativo: muestra la cantidad en existencia junto al ítem, no descuenta
-- ni afecta el conteo. Nullable y genérico en form_definitions (columna
-- irrelevante para el resto de form_type, siempre null en esos casos).
-- Ver CLAUDE.md "Inventario de Operación".
alter table public.form_definitions
  add column if not exists equipment_stock_id uuid references public.equipment_stock(id) on delete set null;
