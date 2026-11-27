-- Skylog V2.0 — SMS Tarjeta de riesgo: enlace de las listas de chequeo con el
-- nivel de riesgo (FRAT). Configuración por organización: un peso por paso de
-- lista y dos umbrales que mapean el puntaje total a zona de tolerabilidad. La
-- ejecución (puntaje por vuelo) ocurre en el Despacho con estas tablas.
-- Tabla nueva = RLS + organization_id + política en la misma migración.

-- Umbrales por organización (una fila por org).
create table risk_card_config (
  organization_id uuid primary key references organizations(id) on delete cascade,
  tolerable_threshold int not null default 1 check (tolerable_threshold >= 0),
  inaceptable_threshold int not null default 3 check (inaceptable_threshold > tolerable_threshold),
  updated_by uuid references people(id),
  updated_at timestamptz not null default now()
);
comment on table risk_card_config is 'SMS Tarjeta de riesgo — umbrales total→zona (aceptable/tolerable/inaceptable) por organización.';

-- Peso de cada paso de cada lista de chequeo. Una respuesta "no" en ese paso
-- suma `weight` al puntaje. Se identifica el paso por (lista, posición).
create table risk_card_weights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  checklist_id uuid not null references checklists(id) on delete cascade,
  position int not null check (position >= 0),
  weight int not null check (weight > 0),
  updated_by uuid references people(id),
  updated_at timestamptz not null default now(),
  unique (checklist_id, position)
);
comment on table risk_card_weights is 'SMS Tarjeta de riesgo — peso de riesgo de un paso de lista de chequeo (suma al puntaje cuando se responde "no").';
create index risk_card_weights_org_idx on risk_card_weights (organization_id);

alter table risk_card_config enable row level security;
alter table risk_card_weights enable row level security;

create policy risk_card_config_select on risk_card_config
  for select using (organization_id in (select v2_current_organization_ids()));
create policy risk_card_config_insert on risk_card_config
  for insert with check (v2_is_duty_manager(organization_id));
create policy risk_card_config_update on risk_card_config
  for update using (v2_is_duty_manager(organization_id)) with check (v2_is_duty_manager(organization_id));
create policy risk_card_config_delete on risk_card_config
  for delete using (v2_is_duty_manager(organization_id));

create policy risk_card_weights_select on risk_card_weights
  for select using (organization_id in (select v2_current_organization_ids()));
create policy risk_card_weights_insert on risk_card_weights
  for insert with check (v2_is_duty_manager(organization_id));
create policy risk_card_weights_update on risk_card_weights
  for update using (v2_is_duty_manager(organization_id)) with check (v2_is_duty_manager(organization_id));
create policy risk_card_weights_delete on risk_card_weights
  for delete using (v2_is_duty_manager(organization_id));
