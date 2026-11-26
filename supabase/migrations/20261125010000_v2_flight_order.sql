-- Orden de vuelo — código que el CLIENTE asigna a cada misión de vuelo (trazabilidad).
-- Decisión 2026-11-25 (usuario): "código por misión, heredado al vuelo".
--
-- Modelo:
--   missions.flight_order  → el código lo pone el cliente al programar la misión.
--   flights.flight_order   → se hereda de la misión del vuelo; editable por vuelo.
--
-- Ambas columnas son TEXT y nullable. NO requieren política RLS nueva: `missions` y
-- `flights` ya tienen RLS por organization_id y sus políticas cubren todas las columnas.
-- No es dato operacional fabricado (regla E): es un dato que ingresa la organización.
-- Es distinto de flights.external_ref (referencia externa libre, p. ej. el nombre del
-- log DJI): la orden de vuelo es el código de negocio del cliente, por eso va aparte.

alter table public.missions add column if not exists flight_order text;
alter table public.flights  add column if not exists flight_order text;

comment on column public.missions.flight_order is
  'Orden de vuelo: código que el cliente asigna a la misión (trazabilidad). Lo heredan los vuelos de la misión.';
comment on column public.flights.flight_order is
  'Orden de vuelo del vuelo; se hereda de missions.flight_order al crear/importar y es editable por vuelo.';

-- Búsqueda/filtrado por código dentro de la organización (parciales para no indexar nulos).
create index if not exists idx_missions_org_flight_order
  on public.missions (organization_id, flight_order) where flight_order is not null;
create index if not exists idx_flights_org_flight_order
  on public.flights (organization_id, flight_order) where flight_order is not null;
