-- Skylog V2.0 — Pólizas (RAC 100 §100.535(27); RCE exigida por §100.410(a)(2)(i)).
-- Solo para el Supabase branch `develop-v2` (regla O1): NUNCA se aplica a producción.
-- Clase ③ Vigente (30-entidades.md §1): tiene fecha de vencimiento y exige alerta.
-- El estado (vigente / por vencer / vencida) NO se guarda: se calcula en
-- packages/domain/src/insuranceCoverage.js a partir de start_date/end_date.

create table if not exists insurance_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  policy_type text not null default 'rce' check (policy_type in ('rce', 'casco', 'otra')),
  insurer text not null,
  policy_number text not null,
  start_date date not null,
  end_date date not null,
  covers_all_fleet boolean not null default true,
  covered_amount_cop numeric(16, 0) check (covered_amount_cop is null or covered_amount_cop >= 0),
  document_path text,
  notes text,
  is_active boolean not null default true,
  created_by uuid references people(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint insurance_policies_dates_check check (end_date >= start_date),
  constraint insurance_policies_number_unique unique (organization_id, insurer, policy_number)
);

comment on table insurance_policies is '30-entidades.md §1 clase ③ / 19-registros-obligatorios.md #27 — póliza con vigencia. covers_all_fleet=true cubre toda la flota; si es false, las aeronaves cubiertas van en insurance_policy_aircraft. El estado de vigencia se calcula (insuranceCoverage.js), nunca se guarda.';

create table if not exists insurance_policy_aircraft (
  policy_id uuid not null references insurance_policies(id) on delete cascade,
  aircraft_id uuid not null references aircraft(id) on delete cascade,
  primary key (policy_id, aircraft_id)
);

comment on table insurance_policy_aircraft is 'Aeronaves cubiertas por una póliza con covers_all_fleet=false. La API valida que la aeronave sea de la misma organización que la póliza.';

create index if not exists insurance_policies_org_end_idx on insurance_policies (organization_id, end_date);
create index if not exists insurance_policy_aircraft_aircraft_idx on insurance_policy_aircraft (aircraft_id);

alter table insurance_policies enable row level security;
alter table insurance_policy_aircraft enable row level security;

-- Solo gestores (admin/jefe_pilotos/gerente_sms/superadmin), lectura y escritura:
-- mismo criterio que Proveedores. Sin nivel de lectura para piloto.
create policy insurance_policies_select on insurance_policies
  for select using (v2_is_duty_manager(organization_id));
create policy insurance_policies_insert on insurance_policies
  for insert with check (v2_is_duty_manager(organization_id));
create policy insurance_policies_update on insurance_policies
  for update using (v2_is_duty_manager(organization_id))
  with check (v2_is_duty_manager(organization_id));
create policy insurance_policies_delete on insurance_policies
  for delete using (v2_is_duty_manager(organization_id));

create policy insurance_policy_aircraft_select on insurance_policy_aircraft
  for select using (
    exists (select 1 from insurance_policies p where p.id = policy_id and v2_is_duty_manager(p.organization_id))
  );
-- El INSERT exige que póliza y aeronave sean de la MISMA organización: sin esto un
-- gestor podría enlazar una aeronave ajena conociendo su id.
create policy insurance_policy_aircraft_insert on insurance_policy_aircraft
  for insert with check (
    exists (
      select 1
      from insurance_policies p
      join aircraft a on a.id = aircraft_id
      where p.id = policy_id
        and a.organization_id = p.organization_id
        and v2_is_duty_manager(p.organization_id)
    )
  );
create policy insurance_policy_aircraft_delete on insurance_policy_aircraft
  for delete using (
    exists (select 1 from insurance_policies p where p.id = policy_id and v2_is_duty_manager(p.organization_id))
  );
