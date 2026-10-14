-- Código de formato y versión de cada reporte PDF, definidos por la organización
-- (la RAC 100 no impone códigos oficiales; cada operador usa los de su manual de operaciones).
-- Forma: { "vuelos": { "code": "F-OPS-002", "version": "1.0" }, ... } — se valida en la API.
alter table organizations add column if not exists report_formats jsonb not null default '{}'::jsonb;
