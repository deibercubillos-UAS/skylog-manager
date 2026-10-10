-- Skylog V2.0 — registro de acciones de usuario (quién hizo qué y cuándo). Solo se agrega: el servidor escribe con la
-- llave de servicio (`lib/v2/auditLog.js`), los gestores de la organización leen, y nadie lo edita ni lo borra desde la
-- aplicación (sin políticas de UPDATE/DELETE; desaparece solo si se elimina la organización).
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_person_id uuid references public.people(id) on delete set null,
  actor_name text,
  action text not null check (action in ('create', 'update', 'delete')),
  module text not null,
  entity_label text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_org_created_idx on public.audit_log (organization_id, created_at desc);
alter table public.audit_log enable row level security;
create policy audit_log_select on public.audit_log as permissive for select to public
  using (public.v2_is_duty_manager(organization_id));
revoke all on table public.audit_log from anon, authenticated, service_role;
grant select on table public.audit_log to authenticated;
grant all on table public.audit_log to service_role;
