-- F3 — Fase 1 del asistente de implantación: política SMS + perfil validado
-- del Gerente de Seguridad Operacional. docs/skylog-v2/40-sms.md §5.2 fase 1
-- · 16-asuntos-complementarios.md §3.
--
-- La designación en sí reutiliza `designations` (ya existe desde la
-- migración de identidad — role_type incluye 'gerente_sms', con
-- resume_doc_id/act_doc_id nullable para cuando exista la entidad
-- Documentos). Aquí solo se agrega `profile jsonb` — el snapshot de los 5
-- criterios validados con validateGsoProfile() al momento de designar, para
-- que quede evidencia de POR QUÉ se aceptó (o para auditar una designación
-- vieja después de que cambien los criterios).

alter table designations add column profile jsonb;

comment on column designations.profile is '16-asuntos-complementarios.md §3 — snapshot de los 5 criterios (validateGsoProfile) evaluados al momento de designar. Solo se llena para role_type=gerente_sms; null para jefe_pilotos/ejecutivo_responsable.';

-- `designations` no tenía política de escritura todavía (deliberadamente
-- deny-all, "hasta que F5/F4a definan sus propios flujos de alta" — ver
-- migración de identidad). F3 es ese primer flujo real: designar/cesar un
-- Gerente SMS. Mismo criterio de gestión que el resto del proyecto.
create policy designations_insert on designations
  for insert with check (v2_is_duty_manager(organization_id));

create policy designations_update on designations
  for update using (v2_is_duty_manager(organization_id))
  with check (v2_is_duty_manager(organization_id));

create table sms_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  policy_text text not null,
  scope text not null,
  effective_date date not null,
  signed_by uuid references people(id),
  signed_at timestamptz,
  created_by uuid references people(id),
  created_at timestamptz not null default now()
);

comment on table sms_policies is '40-sms.md §5.2 fase 1 — política y objetivos de seguridad operacional firmada. Histórico completo (una fila por versión), la vigente es la de mayor effective_date con signed_at no nulo.';

create index sms_policies_org_idx on sms_policies (organization_id);

alter table sms_policies enable row level security;

create policy sms_policies_select on sms_policies
  for select using (organization_id in (select v2_current_organization_ids()));

create policy sms_policies_insert on sms_policies
  for insert with check (v2_is_duty_manager(organization_id));

create policy sms_policies_update on sms_policies
  for update using (v2_is_duty_manager(organization_id))
  with check (v2_is_duty_manager(organization_id));
