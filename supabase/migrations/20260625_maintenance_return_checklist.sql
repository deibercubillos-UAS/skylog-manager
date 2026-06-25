-- Fase A — Checklist de recibo de drone posterior al mantenimiento
--
-- Las DEFINICIONES del checklist reutilizan la tabla genérica `form_definitions`
-- con form_type='maintenance_return' (no requiere cambios de esquema).
--
-- Los RESULTADOS se guardan compactos como JSONB { "field_number": true/false }
-- en una columna nueva de maintenance_logs. El texto del ítem NO se duplica:
-- se dereferencia contra form_definitions al mostrar.
ALTER TABLE public.maintenance_logs
  ADD COLUMN IF NOT EXISTS return_checklist jsonb;
