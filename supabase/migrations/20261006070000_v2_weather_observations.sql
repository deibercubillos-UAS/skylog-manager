-- Skylog V2.0 — observación meteorológica archivada con el vuelo (31-esquema-datos.md: «se archiva junto al
-- vuelo, no se descarta tras consultarla»; 19-registros-obligatorios.md ítem 29 listaba la meteorología archivada
-- como no existente). Se toma al DESPACHAR (la condición con la que se decidió volar), queda ligada al despacho y,
-- al cerrar el vuelo, se enlaza en `flights.weather_observation_id`. La escribe solo el servidor (service role).
create table weather_observations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  dispatch_id uuid unique references dispatches(id) on delete set null,
  lat numeric not null,
  lon numeric not null,
  observed_at timestamptz not null,
  source text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
comment on table weather_observations is 'Condiciones meteorológicas en la zona de la misión al despachar (Open-Meteo). Se conservan 5 años con el vuelo; no se recalculan.';
create index weather_observations_org_idx on weather_observations (organization_id, observed_at desc);

alter table weather_observations enable row level security;
create policy weather_observations_select on weather_observations
  for select using (organization_id in (select v2_current_organization_ids()));

create trigger weather_observations_retention before delete on weather_observations
  for each row execute function v2_enforce_retention('observed_at');

alter table flights add constraint flights_weather_observation_fk
  foreign key (weather_observation_id) references weather_observations(id) on delete set null;
