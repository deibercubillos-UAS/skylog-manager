-- Skylog V2.0 — Gestión del cambio del SMS (RAC 219 §219.105(c)(2)).
-- Proceso para identificar si un cambio (flota, procedimientos, personal, infraestructura…) afecta la
-- seguridad operacional y gestionar los riesgos que surjan; los factores humanos se consideran por escrito.
-- Un cambio que SÍ impacta no se da por implementado sin un peligro enlazado y evaluado (regla en
-- packages/domain/src/changeManagement.js, verificada también por el servidor).

create table sms_changes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  change_type text not null default 'otro'
    check (change_type in ('flota', 'procedimientos', 'personal', 'organizacion', 'infraestructura', 'normativo', 'otro')),
  planned_date date,
  status text not null default 'identificado'
    check (status in ('identificado', 'evaluado', 'implementado', 'descartado')),
  safety_impact text not null default 'por_evaluar'
    check (safety_impact in ('por_evaluar', 'si', 'no')),
  impact_justification text,
  human_factors_notes text,
  hazard_id uuid references hazards(id) on delete set null,
  responsible_id uuid references people(id) on delete set null,
  decision_notes text,
  implemented_at timestamptz,
  created_by uuid references people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table sms_changes is 'Gestión del cambio (RAC 219 §219.105(c)(2)): cambio identificado → evaluado → implementado/descartado, con impacto en seguridad, factores humanos y el peligro/riesgo asociado.';
create index sms_changes_org_idx on sms_changes (organization_id, created_at desc);

alter table sms_changes enable row level security;

-- Todo miembro lo lee (comunicación del cambio); lo gestiona un gestor de la organización.
create policy sms_changes_select on sms_changes
  for select using (organization_id in (select v2_current_organization_ids()));
create policy sms_changes_write on sms_changes
  for all using (v2_is_duty_manager(organization_id)) with check (v2_is_duty_manager(organization_id));

create or replace function v2_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger sms_changes_updated_at before update on sms_changes
  for each row execute function v2_touch_updated_at();

-- Es un registro del SMS: se conserva 5 años (un cambio equivocado se «descarta», no se borra).
create trigger sms_changes_retention before delete on sms_changes
  for each row execute function v2_enforce_retention('created_at');
