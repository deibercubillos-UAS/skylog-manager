-- Skylog V2.0 — SMS: Matriz de peligros (tercera sección del grupo SMS).
-- Sobre el catálogo de peligros ya existente (`hazards`, F3 — NO se duplica el
-- peligro) se definen controles, y de cada control se registran avances con
-- evidencia (PDF/imagen en R2, path privado nunca expuesto).
--
-- Regla del proyecto: tabla nueva = RLS + organization_id + política en la
-- misma migración. Lectura para cualquier miembro (transparencia del SMS,
-- mismo criterio que `hazards`); escritura solo gestores (v2_is_duty_manager:
-- admin/jefe_pilotos/gerente_sms/superadmin), que es quien gestiona el SMS.

create table hazard_controls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  hazard_id uuid not null references hazards(id) on delete cascade,
  description text not null,
  control_type text check (control_type in ('preventivo', 'mitigador', 'recuperacion')),
  responsible text,
  due_date date,
  status text not null default 'pendiente' check (status in ('pendiente', 'en_progreso', 'implementado', 'verificado')),
  created_by uuid references people(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table hazard_controls is 'SMS Matriz de peligros — control/defensa definido para un peligro del catálogo `hazards`.';
create index hazard_controls_org_idx on hazard_controls (organization_id);
create index hazard_controls_hazard_idx on hazard_controls (hazard_id);

create table hazard_control_updates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  control_id uuid not null references hazard_controls(id) on delete cascade,
  note text not null,
  progress_pct int check (progress_pct between 0 and 100),
  evidence_path text,
  created_by uuid references people(id),
  created_at timestamptz not null default now()
);
comment on table hazard_control_updates is 'SMS Matriz de peligros — avance de un control, con evidencia opcional (PDF/imagen en R2).';
create index hazard_control_updates_org_idx on hazard_control_updates (organization_id);
create index hazard_control_updates_control_idx on hazard_control_updates (control_id);

alter table hazard_controls enable row level security;
alter table hazard_control_updates enable row level security;

create policy hazard_controls_select on hazard_controls
  for select using (organization_id in (select v2_current_organization_ids()));
create policy hazard_controls_insert on hazard_controls
  for insert with check (v2_is_duty_manager(organization_id));
create policy hazard_controls_update on hazard_controls
  for update using (v2_is_duty_manager(organization_id)) with check (v2_is_duty_manager(organization_id));
create policy hazard_controls_delete on hazard_controls
  for delete using (v2_is_duty_manager(organization_id));

create policy hazard_control_updates_select on hazard_control_updates
  for select using (organization_id in (select v2_current_organization_ids()));
create policy hazard_control_updates_insert on hazard_control_updates
  for insert with check (v2_is_duty_manager(organization_id));
create policy hazard_control_updates_update on hazard_control_updates
  for update using (v2_is_duty_manager(organization_id)) with check (v2_is_duty_manager(organization_id));
create policy hazard_control_updates_delete on hazard_control_updates
  for delete using (v2_is_duty_manager(organization_id));
