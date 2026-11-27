-- Skylog V2.0 — SMS: SPI vs KPI. Los SPI son los indicadores oficiales de la
-- Aerocivil (is_official = true); los KPI son los propios de la organización
-- (is_official = false) y miden un PELIGRO. La asociación KPI→peligro es
-- obligatoria por API (se valida al crear/editar). La columna es nullable a
-- nivel de esquema porque: (a) los SPI oficiales no llevan peligro, y (b) los
-- KPI creados antes de esta migración quedan sin peligro hasta reasignarlos.
--
-- on delete restrict: no se puede eliminar un peligro que tenga un KPI asociado
-- (la API de borrado de peligros lo avisa y pide reasignar/eliminar el KPI).
alter table safety_indicators
  add column hazard_id uuid references hazards(id) on delete restrict;
create index safety_indicators_hazard_idx on safety_indicators (hazard_id);
comment on column safety_indicators.hazard_id is 'KPI (is_official=false): peligro que mide (obligatorio por API). Los SPI oficiales no llevan peligro.';
