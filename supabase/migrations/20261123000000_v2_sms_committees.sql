-- Skylog V2.0 — SMS: comités de seguridad operacional SRB y SAG (40a-sms-comites-srb-sag.md).
-- Modelo tomado del Manual de Operaciones WAS §11.12.7 (estructura RAC 219 / OACI):
--   • SRB (Comité de Revisión de Seguridad Operacional): estratégico, semestral.
--   • SAG (Grupo de Acción de Seguridad Operacional): operativo, mensual.
-- Dos tablas: integrantes del comité (pertenencia, independiente del rol operativo) y actas de reunión.
-- Un integrante solo-comité entra con el rol de membresía `comite` (no cuenta como piloto, sin permisos
-- de la matriz) y solo ve la sección de su comité. GG y GS administran; el Jefe de Pilotos y los integrantes ven.
-- Orden importante: las funciones `language sql` se validan contra sus tablas al crearse, así que las tablas
-- van antes de `v2_is_committee_member`.

-- Helper: ¿la sesión actual ADMINISTRA los comités SMS? (solo GG, GS y superadmin — más estricto que v2_is_duty_manager).
create or replace function v2_is_sms_committee_admin(p_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from memberships m
    join accounts a on a.person_id = m.person_id
    where a.auth_user_id = auth.uid()
      and m.organization_id = p_organization_id
      and m.status = 'activa'
      and m.role in ('admin', 'gerente_sms', 'superadmin')
  );
$$;

comment on function v2_is_sms_committee_admin is 'RLS helper (40a) — true si la sesión administra los comités SMS (SRB/SAG) de esa organización: Gerente General, Gerente SMS o superadmin.';

-- Integrantes del comité.
create table sms_committee_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  committee text not null check (committee in ('srb', 'sag')),
  person_id uuid not null references people(id) on delete cascade,
  role_in_committee text not null default 'miembro'
    check (role_in_committee in ('presidente', 'secretario', 'coordinador', 'miembro', 'invitado')),
  added_by uuid references people(id),
  created_at timestamptz not null default now(),
  unique (organization_id, committee, person_id)
);

create index sms_committee_members_org_committee_idx on sms_committee_members (organization_id, committee);
create index sms_committee_members_person_idx on sms_committee_members (person_id);

-- Actas de reunión.
create table sms_committee_meetings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  committee text not null check (committee in ('srb', 'sag')),
  meeting_date date not null,
  meeting_type text not null default 'ordinaria'
    check (meeting_type in ('ordinaria', 'extraordinaria')),
  title text not null,
  agenda text not null default '',
  decisions text not null default '',           -- SRB: decisiones · SAG: acciones (§11.12.7)
  commitments jsonb not null default '[]'::jsonb, -- [{texto, responsable, plazo}]
  attendees jsonb not null default '[]'::jsonb,   -- [{nombre|person_id, firma?}]
  created_by uuid references people(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sms_committee_meetings_org_committee_idx on sms_committee_meetings (organization_id, committee);

-- Helper: ¿la sesión actual es integrante de ese comité? (ya existe la tabla que referencia).
create or replace function v2_is_committee_member(p_organization_id uuid, p_committee text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from sms_committee_members cm
    join accounts a on a.person_id = cm.person_id
    where a.auth_user_id = auth.uid()
      and cm.organization_id = p_organization_id
      and cm.committee = p_committee
  );
$$;

comment on function v2_is_committee_member is 'RLS helper (40a) — true si la sesión pertenece a ese comité (srb|sag) en la organización.';

-- Mismo blindaje que v2_is_duty_manager: estos helpers SECURITY DEFINER solo los usa RLS; no se exponen a
-- `anon` ni a PUBLIC vía /rest/v1/rpc. `authenticated` conserva EXECUTE (lo necesita la evaluación de las políticas).
revoke execute on function v2_is_sms_committee_admin(uuid) from public, anon;
revoke execute on function v2_is_committee_member(uuid, text) from public, anon;

-- RLS: ver = gestores (v2_is_duty_manager, incluye Jefe de Pilotos) o el integrante del comité;
-- escribir = solo administradores de comité (GG/GS/superadmin).
alter table sms_committee_members enable row level security;
alter table sms_committee_meetings enable row level security;

create policy sms_committee_members_select on sms_committee_members
  for select using (
    v2_is_duty_manager(organization_id)
    or v2_is_committee_member(organization_id, committee)
  );
create policy sms_committee_members_insert on sms_committee_members
  for insert with check (v2_is_sms_committee_admin(organization_id));
create policy sms_committee_members_update on sms_committee_members
  for update using (v2_is_sms_committee_admin(organization_id))
  with check (v2_is_sms_committee_admin(organization_id));
create policy sms_committee_members_delete on sms_committee_members
  for delete using (v2_is_sms_committee_admin(organization_id));

create policy sms_committee_meetings_select on sms_committee_meetings
  for select using (
    v2_is_duty_manager(organization_id)
    or v2_is_committee_member(organization_id, committee)
  );
create policy sms_committee_meetings_insert on sms_committee_meetings
  for insert with check (v2_is_sms_committee_admin(organization_id));
create policy sms_committee_meetings_update on sms_committee_meetings
  for update using (v2_is_sms_committee_admin(organization_id))
  with check (v2_is_sms_committee_admin(organization_id));
create policy sms_committee_meetings_delete on sms_committee_meetings
  for delete using (v2_is_sms_committee_admin(organization_id));
