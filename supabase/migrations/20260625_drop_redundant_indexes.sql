-- Limpieza: índices de una sola columna `organization_id` que son ESTRICTAMENTE
-- redundantes porque ya existe un compuesto `(organization_id, created_at DESC)` en
-- la misma tabla. El compuesto sirve tanto las consultas por org como la verificación
-- de la FK organization_id, así que el índice simple no aporta nada (solo costo de escritura).
--
-- Conservados a propósito (NO redundantes): todos los índices FK (protegen cascadas/locks),
-- los parciales (p.ej. idx_flights_replay_path) y los que sostienen features sin tráfico aún.

DROP INDEX IF EXISTS public.idx_maintenance_logs_org;   -- cubierto por idx_maintenance_org_created
DROP INDEX IF EXISTS public.idx_sora_assessments_org;   -- cubierto por idx_sora_org_created
DROP INDEX IF EXISTS public.idx_inventory_items_org_id; -- cubierto por idx_inventory_org_created
