-- F3 — SPI: indicadores de desempeño en seguridad operacional.
-- docs/skylog-v2/13-herramientas-spi.md · 31-esquema-datos.md §4 · 40-sms.md §5.2 fase 3.
--
-- `organization_monthly_cycles`: el denominador (ciclos de vuelo) es UN SOLO
-- valor por organización/mes, compartido por todos los indicadores (§3.1 de
-- la circular: "es un dato único por periodo, no uno por indicador") — nunca
-- se repite por indicador, evita que dos SPI del mismo mes tengan
-- denominadores distintos por error de captura.
create table organization_monthly_cycles (
  organization_id uuid not null references organizations(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  cycles int not null default 0 check (cycles >= 0),
  updated_by uuid references people(id),
  updated_at timestamptz not null default now(),
  primary key (organization_id, year, month)
);

comment on table organization_monthly_cycles is '13-herramientas-spi.md §1/§3.1 — ciclos de vuelo del mes (despegue+aterrizaje), denominador único compartido por todos los SPI de esa organización/mes. Meses con 0 ciclos se guardan igual (D2) — nunca NULL.';

create table safety_indicators (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  taxonomy_code text, -- código oficial si is_official, null si es propio
  is_official boolean not null default false,
  active boolean not null default true,
  expected_improvement_pct numeric(5,4), -- §3.3: "mejora esperada en %", ej. 0.10 = 10%
  created_by uuid references people(id),
  created_at timestamptz not null default now()
);

comment on table safety_indicators is '13-herramientas-spi.md §2/§10 — catálogo abierto (regla C5): los 11 oficiales (is_official, no editables por el cliente) + los propios de la organización, ambos validados contra §5 (qué NO es un SPI) al crearse.';

create index safety_indicators_org_idx on safety_indicators (organization_id);

create table safety_indicator_monthly (
  id uuid primary key default gen_random_uuid(),
  indicator_id uuid not null references safety_indicators(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  events int not null default 0 check (events >= 0),
  rate numeric not null, -- calculado server-side con monthlyRate(events, cycles) — sin redondear (D3)
  created_by uuid references people(id),
  created_at timestamptz not null default now(),
  unique (indicator_id, year, month)
);

comment on table safety_indicator_monthly is '13-herramientas-spi.md §9.2 — un dato mensual por indicador. `rate` es un snapshot calculado server-side contra organization_monthly_cycles del mismo periodo — evidencia histórica, no se recalcula si los ciclos se corrigen después (D5: una corrección retroactiva es una reapertura explícita, no automática).';

create index safety_indicator_monthly_indicator_idx on safety_indicator_monthly (indicator_id);
create index safety_indicator_monthly_org_idx on safety_indicator_monthly (organization_id);

create table safety_indicator_action_plans (
  id uuid primary key default gen_random_uuid(),
  indicator_id uuid not null references safety_indicators(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  defense_type text not null check (defense_type in ('T', 'R', 'E')),
  root_cause text not null,
  trigger_under_control text not null,
  plan text not null,
  official_document text,
  execution_days int check (execution_days > 0),
  created_by uuid references people(id),
  created_at timestamptz not null default now()
);

comment on table safety_indicator_action_plans is '13-herramientas-spi.md §4 — defensa T/R/E, causa raíz, desencadenante bajo gobernabilidad (distinto de la causa raíz), plan, documento oficial, tiempo de ejecución. Validado contra los verbos prohibidos (§4) server-side antes de guardar.';

create index safety_indicator_action_plans_indicator_idx on safety_indicator_action_plans (indicator_id);

alter table organization_monthly_cycles enable row level security;
alter table safety_indicators enable row level security;
alter table safety_indicator_monthly enable row level security;
alter table safety_indicator_action_plans enable row level security;

-- Lectura para cualquier miembro (transparencia del SMS); escritura solo
-- gestores — mismo criterio que el resto de F3.
create policy organization_monthly_cycles_select on organization_monthly_cycles
  for select using (organization_id in (select v2_current_organization_ids()));

create policy organization_monthly_cycles_upsert on organization_monthly_cycles
  for insert with check (v2_is_duty_manager(organization_id));

create policy organization_monthly_cycles_update on organization_monthly_cycles
  for update using (v2_is_duty_manager(organization_id))
  with check (v2_is_duty_manager(organization_id));

create policy safety_indicators_select on safety_indicators
  for select using (organization_id in (select v2_current_organization_ids()));

create policy safety_indicators_insert on safety_indicators
  for insert with check (v2_is_duty_manager(organization_id));

create policy safety_indicator_monthly_select on safety_indicator_monthly
  for select using (organization_id in (select v2_current_organization_ids()));

create policy safety_indicator_monthly_insert on safety_indicator_monthly
  for insert with check (v2_is_duty_manager(organization_id));

create policy safety_indicator_action_plans_select on safety_indicator_action_plans
  for select using (organization_id in (select v2_current_organization_ids()));

create policy safety_indicator_action_plans_insert on safety_indicator_action_plans
  for insert with check (v2_is_duty_manager(organization_id));
