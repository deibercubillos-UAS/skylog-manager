-- F3 — matriz de riesgo del SMS interno (configurable, regla C3) + catálogo
-- de peligros + evaluaciones + barreras. docs/skylog-v2/31-esquema-datos.md §4
-- · 40-sms.md §5.2 fase 2 · 18-analisis-riesgos-vuelo.md R1 (nunca mezclar con
-- la matriz fija de la autoridad, risk_analyses de F4a).
--
-- `risk_matrices`: una fila por organización — probability_levels/
-- severity_levels/tolerability en jsonb, como configuración de documento (no
-- explota en filas porque se lee/escribe como una unidad, mismo criterio que
-- risk_analyses.hazards de F4a). Sin semilla OACI hardcodeada (ver
-- packages/domain/src/internalRiskMatrix.js — pendiente de fuente verificada).

create table risk_matrices (
  organization_id uuid primary key references organizations(id) on delete cascade,
  probability_levels jsonb not null default '[]'::jsonb,
  severity_levels jsonb not null default '[]'::jsonb,
  tolerability jsonb not null default '[]'::jsonb,
  updated_by uuid references people(id),
  updated_at timestamptz not null default now()
);

comment on table risk_matrices is '31-esquema-datos.md §4 — matriz de riesgo SMS interna, configurable por organización (regla C3). Distinta de risk_analyses (F4a), que es la matriz fija de la autoridad (regla C2) — nunca se mezclan (18-analisis-riesgos-vuelo.md R1).';

create table hazards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  description text not null,
  source text, -- de dónde surgió: 'reporte_sms', 'observacion', 'auto_duty_exception', texto libre
  mission_type text,
  related_barrier_id uuid,
  created_by uuid references people(id),
  created_at timestamptz not null default now()
);

comment on table hazards is '31-esquema-datos.md §4 — catálogo de peligros identificados por la organización.';

create index hazards_org_idx on hazards (organization_id);

create table barriers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  description text not null,
  category text,
  created_by uuid references people(id),
  created_at timestamptz not null default now()
);

comment on table barriers is '31-esquema-datos.md §4 — control o defensa declarada.';

create index barriers_org_idx on barriers (organization_id);

alter table hazards add constraint hazards_related_barrier_fk
  foreign key (related_barrier_id) references barriers(id) on delete set null;

create table risk_assessments (
  id uuid primary key default gen_random_uuid(),
  hazard_id uuid not null references hazards(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  probability_code int not null,
  severity_code text not null,
  initial_zone text,
  mitigation text,
  residual_probability_code int,
  residual_severity_code text,
  residual_zone text,
  created_by uuid references people(id),
  created_at timestamptz not null default now()
);

comment on table risk_assessments is '31-esquema-datos.md §4 — probabilidad/severidad/mitigación/residual de un peligro, evaluados contra risk_matrices de la organización. `initial_zone`/`residual_zone` son el snapshot calculado server-side con evaluateInternalHazard() al guardar — evidencia histórica, no se recalculan si la matriz cambia después.';

create index risk_assessments_hazard_idx on risk_assessments (hazard_id);
create index risk_assessments_org_idx on risk_assessments (organization_id);

alter table risk_matrices enable row level security;
alter table hazards enable row level security;
alter table barriers enable row level security;
alter table risk_assessments enable row level security;

-- Lectura para cualquier miembro (transparencia del SMS, mismo criterio que
-- production `safety_hazards`/`safety_barriers`); escritura solo gestores —
-- configurar la matriz o registrar peligros/barreras es función de gestión SMS.
create policy risk_matrices_select on risk_matrices
  for select using (organization_id in (select v2_current_organization_ids()));

create policy risk_matrices_upsert on risk_matrices
  for insert with check (v2_is_duty_manager(organization_id));

create policy risk_matrices_update on risk_matrices
  for update using (v2_is_duty_manager(organization_id))
  with check (v2_is_duty_manager(organization_id));

create policy hazards_select on hazards
  for select using (organization_id in (select v2_current_organization_ids()));

create policy hazards_insert on hazards
  for insert with check (v2_is_duty_manager(organization_id));

create policy barriers_select on barriers
  for select using (organization_id in (select v2_current_organization_ids()));

create policy barriers_insert on barriers
  for insert with check (v2_is_duty_manager(organization_id));

create policy risk_assessments_select on risk_assessments
  for select using (organization_id in (select v2_current_organization_ids()));

create policy risk_assessments_insert on risk_assessments
  for insert with check (v2_is_duty_manager(organization_id));
