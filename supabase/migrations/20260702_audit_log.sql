-- Fase 5.a — Registro de auditoría de acciones de usuario
-- Tabla append-only: cada acción relevante deja una fila. Solo el service role
-- escribe (vía lib/auditLog.js); los managers leen las de su propia organización.
--
-- ⚠️ Migración aditiva: crear esta tabla NO afecta ninguna funcionalidad
-- existente. El helper logAudit() es fire-and-forget y falla en silencio si la
-- tabla aún no existe, así que el código puede desplegarse antes de aplicar esto.

create table if not exists public.audit_log (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  actor_id         uuid references auth.users(id) on delete set null,
  actor_name       text,
  action           text not null,      -- p.ej. 'create', 'update', 'delete'
  module           text not null,      -- p.ej. 'fleet', 'pilots', 'flights', 'maintenance'
  entity_label     text,               -- descripción legible del objeto afectado
  metadata         jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists idx_audit_log_org_created
  on public.audit_log (organization_id, created_at desc);

alter table public.audit_log enable row level security;

-- SELECT: managers (admin/superadmin/gerente_sms/jefe_pilotos) de la misma org.
-- Mismos roles que PERMISSIONS.canViewAudit en src/lib/roles.js.
-- El chequeo de rol va inline contra profiles (el usuario siempre puede leer su
-- propia fila) en vez de depender de private.user_is_manager(), que no está
-- versionada en este repo y no se puede garantizar su existencia/firma.
drop policy if exists audit_log_select_managers on public.audit_log;
create policy audit_log_select_managers on public.audit_log
  for select
  using (
    organization_id = private.user_org_id()
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('admin', 'superadmin', 'gerente_sms', 'jefe_pilotos')
    )
  );

-- Sin política de INSERT/UPDATE/DELETE → solo el service role escribe.
