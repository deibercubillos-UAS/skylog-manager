-- Skylog V2.0 — tabla de correspondencia del ETL v1 → V2 (docs/skylog-v2/32-migracion.md premisa 4): permite re-ejecutar
-- el script sin duplicar y traducir los identificadores de v1. Solo la usa el servidor con la llave de servicio.
create table if not exists public.etl_id_map (
  entity text not null,
  id_v1 text not null,
  id_v2 uuid not null,
  created_at timestamptz not null default now(),
  primary key (entity, id_v1)
);
alter table public.etl_id_map enable row level security; -- sin políticas: ningún usuario la lee ni la escribe
