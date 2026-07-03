-- Catálogo de protocolos y procedimientos (rediseño de Protocolos, 2026-07-03)
-- Distinto de form_definitions (checklists de slots fijos: salud/pre-vuelo/
-- briefing/recibo mtto, ya wireados al despacho real) — esto es una biblioteca
-- de referencia de procedimientos con nombre/categoría/pasos libres, tal como
-- pidió el usuario replicando el mockup "Protocolos"/"Nuevo Protocolo".

create table if not exists public.protocols (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null,
  category         text not null check (category in ('Pre-vuelo', 'En vuelo', 'Post-vuelo', 'Emergencia', 'Mantenimiento')),
  description      text,
  icon             text not null default 'checklist',
  steps            jsonb not null default '[]'::jsonb,  -- array de strings, orden = índice
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_protocols_org_category
  on public.protocols (organization_id, category);

alter table public.protocols enable row level security;

-- SELECT/INSERT/UPDATE/DELETE: mismos roles que ya guardan esta página en
-- dashboard/settings/forms/layout.js (requirePermission('canViewFinance') =
-- superadmin/admin/gerente_sms en src/lib/roles.js).
drop policy if exists protocols_managers on public.protocols;
create policy protocols_managers on public.protocols
  for all
  using (
    organization_id = private.user_org_id()
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('admin', 'superadmin', 'gerente_sms')
    )
  )
  with check (
    organization_id = private.user_org_id()
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('admin', 'superadmin', 'gerente_sms')
    )
  );
