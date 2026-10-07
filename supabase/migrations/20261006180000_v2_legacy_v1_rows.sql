-- Skylog V2.0 — archivo de v1 dentro del proyecto de V2 (docs/skylog-v2/32-migracion.md §7.3 y 32a). Cada fila de cada tabla
-- de v1 se conserva TAL COMO ERA, en JSONB, antes de cualquier transformación: lo que V2 no modela (SORA, resultados de
-- listas, bitácora de acciones, columnas sin destino…) no se pierde y puede entregarse a un inspector (retención de 5 años).
-- Es una tabla del esquema público con RLS sin políticas (solo servidor), no un esquema aparte: así no hace falta exponerlo.
create table if not exists public.legacy_v1_rows (
  source_table text not null,
  id_v1 text not null,
  data jsonb not null,
  archived_at timestamptz not null default now(),
  primary key (source_table, id_v1)
);
comment on table public.legacy_v1_rows is 'Copia fiel (JSONB) de las filas de v1. Solo lectura de archivo; no se usa en la operación de V2. Las contraseñas cifradas NO se archivan.';
alter table public.legacy_v1_rows enable row level security;
