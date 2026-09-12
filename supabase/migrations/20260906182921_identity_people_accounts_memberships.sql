-- Identidad y organización (V2) — docs/skylog-v2/30-entidades.md §2 · 31-esquema-datos.md §1
--
-- Reemplaza la superposición profiles/pilots de v1 (donde ya divergen 5/10 teléfonos,
-- 5/10 licencias, 2/10 vencimientos de certificado médico — 20-auditoria-datos.md) con
-- tres entidades separadas: Cuenta (credencial), Persona (existe con o sin cuenta) y
-- Membresía (el vínculo persona↔organización con rol y vigencia — resuelve el caso real
-- de ser Jefe de Pilotos en una org y piloto en otra).
--
-- No hereda el esquema de producción a propósito (regla A1, 01-reglas.md §8): esta rama
-- de desarrollo no tiene copia de `organizations`/`profiles` — se diseña desde el
-- problema. `organizations` nace aquí en su forma mínima de v2; crece por migración
-- aditiva a medida que cada frente lo necesite (E5: función sin uso real no carga esquema).

create table organizations (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  nit text,
  domicile text,
  created_at timestamptz not null default now()
);

comment on table organizations is '30-entidades.md §2.3 — el explotador UAS. Razón social, NIT, domicilio. Forma mínima de v2, crece por migración aditiva.';

create table people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  document_type text,
  document_number text,
  phone text,
  email text,
  license_number text,
  medical_cert_expiry date,
  medical_cert_doc_id uuid,
  created_at timestamptz not null default now()
);

comment on table people is '30-entidades.md §2.2 — un ser humano. Existe aunque no tenga cuenta (un observador o técnico puede estar registrado sin usar el sistema). El certificado médico vive aquí, no en la membresía ni en una cuenta — es el campo que diverge en producción (2/10 casos) por vivir hoy en dos tablas.';

create table accounts (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table accounts is '30-entidades.md §2.2 — credencial de acceso. Es de la Persona, no de la organización: sobrevive a cambiar de empleador. Una Persona puede no tener cuenta.';

create index accounts_person_idx on accounts (person_id);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null,
  status text not null default 'activa' check (status in ('activa', 'cerrada')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  constraint memberships_ended_after_started check (ended_at is null or ended_at > started_at)
);

comment on table memberships is '30-entidades.md §2.2 — el vínculo Persona↔Organización con rol y vigencia. El rol vive aquí, no en la Persona: el mismo humano puede ser Jefe de Pilotos en una empresa y piloto en otra. Dar de baja cierra la membresía; la Persona y su historia siguen existiendo (retención de 5 años).';

create index memberships_person_idx on memberships (person_id);
create index memberships_org_idx on memberships (organization_id);
create unique index memberships_person_org_active_uidx on memberships (person_id, organization_id) where status = 'activa';

create table designations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  role_type text not null check (role_type in ('jefe_pilotos', 'gerente_sms', 'ejecutivo_responsable')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  resume_doc_id uuid,
  act_doc_id uuid,
  created_at timestamptz not null default now()
);

comment on table designations is '30-entidades.md §2.3 — acta que nombra a alguien, con vigencia. 100.535(14)(15)(16) exige designar; MAUT-5.0-22-011 exige presentar hojas de vida. Un rol en un desplegable no es evidencia de designación: el acta con fecha sí.';

create index designations_org_idx on designations (organization_id);
create index designations_person_idx on designations (person_id);

create table organization_certifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  cdo_number text,
  cdo_issued_at date,
  allowed_operation_types jsonb not null default '[]'::jsonb,
  allowed_visual_contact jsonb not null default '[]'::jsonb,
  opspecs_doc_id uuid,
  expires_at date,
  created_at timestamptz not null default now()
);

comment on table organization_certifications is '30-entidades.md §2.3 — CDO-U + OpSpecs: gobierna qué se puede programar. Si BVLOS no está en allowed_operation_types, el sistema no debe dejar programarlo.';

create index organization_certifications_org_idx on organization_certifications (organization_id);

-- Helper de RLS: organizaciones donde la sesión actual tiene una membresía activa.
-- SECURITY DEFINER porque memberships/accounts se consultan entre sí antes de que
-- exista ninguna política propia sobre ellas — mismo patrón que private.user_org_id()
-- en producción (CLAUDE.md), aquí en public por ser un esquema de desarrollo nuevo.
create or replace function v2_current_organization_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select m.organization_id
  from memberships m
  join accounts a on a.person_id = m.person_id
  where a.auth_user_id = auth.uid()
    and m.status = 'activa';
$$;

comment on function v2_current_organization_ids is 'RLS helper — organizaciones donde la sesión autenticada tiene membresía activa. Ver docs/skylog-v2/34-seguridad.md.';

-- Roles con permisos de gestión (mismo vocabulario que producción: CLAUDE.md
-- PERMISSIONS.canManageOps/canManageSMS). Definido inline en cada política por ahora
-- (E5: sin tabla de permisos hasta que un segundo frente la necesite realmente).

alter table organizations enable row level security;
alter table people enable row level security;
alter table accounts enable row level security;
alter table memberships enable row level security;
alter table designations enable row level security;
alter table organization_certifications enable row level security;

create policy organizations_select_members on organizations
  for select using (id in (select v2_current_organization_ids()));

create policy accounts_select_own on accounts
  for select using (auth_user_id = auth.uid());

create policy people_select_orgmates on people
  for select using (
    id in (
      select m.person_id from memberships m
      where m.organization_id in (select v2_current_organization_ids())
    )
  );

create policy memberships_select_orgmates on memberships
  for select using (organization_id in (select v2_current_organization_ids()));

create policy designations_select_orgmates on designations
  for select using (organization_id in (select v2_current_organization_ids()));

create policy organization_certifications_select_orgmates on organization_certifications
  for select using (organization_id in (select v2_current_organization_ids()));

-- Sin políticas de INSERT/UPDATE/DELETE todavía: la escritura de este primer corte de
-- identidad se hace vía service role desde el backend (mismo patrón que producción para
-- operaciones privilegiadas) hasta que F5/F4 definan sus propios flujos de alta. Deny-all
-- por defecto es más seguro que una política de escritura inventada sin un flujo real
-- detrás (mismo criterio ya aplicado en duty_periods, ver migración anterior).
