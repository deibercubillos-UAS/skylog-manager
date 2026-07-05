-- Proveedores: listado + checklist de auditoría de proveedores (2026-07-20).
-- Gestión (crear/editar proveedores, configurar el checklist, registrar
-- auditorías): mismo split de permisos que Manuales/Capacitación —
-- superadmin/admin/gerente_sms/jefe_pilotos (private.user_is_manager()).
-- Sin nivel de solo-lectura para piloto: a diferencia de Manuales/
-- Capacitación, este módulo es 100% de back-office/cumplimiento, no algo
-- que el piloto de campo necesite consultar.

create table if not exists public.suppliers (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null,
  category         text,
  tax_id           text,
  contact_name     text,
  contact_email    text,
  contact_phone    text,
  address          text,
  status           text not null default 'activo' check (status in ('activo', 'inactivo')),
  notes            text,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_suppliers_org on public.suppliers (organization_id);

create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute function set_updated_at();

alter table public.suppliers enable row level security;

create policy suppliers_select on public.suppliers
  for select using (organization_id = private.user_org_id() and private.user_is_manager());
create policy suppliers_insert on public.suppliers
  for insert with check (organization_id = private.user_org_id() and private.user_is_manager());
create policy suppliers_update on public.suppliers
  for update using (organization_id = private.user_org_id() and private.user_is_manager())
  with check (organization_id = private.user_org_id() and private.user_is_manager());
create policy suppliers_delete on public.suppliers
  for delete using (organization_id = private.user_org_id() and private.user_is_manager());

-- Catálogo de criterios de auditoría — un solo checklist compartido y
-- personalizable por la organización (agregar/editar/quitar), aplicado por
-- igual a cualquier proveedor que se audite. Mismo patrón que la
-- autoevaluación GAP del SMS (catálogo editable + respuestas por sesión),
-- pero sin catálogo global/regulatorio: aquí cada organización parte de
-- cero y arma su propio checklist.
create table if not exists public.supplier_audit_criteria (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  criterion        text not null,
  category         text,
  order_index      int not null default 0,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_supplier_audit_criteria_org on public.supplier_audit_criteria (organization_id);

create trigger supplier_audit_criteria_set_updated_at
  before update on public.supplier_audit_criteria
  for each row execute function set_updated_at();

alter table public.supplier_audit_criteria enable row level security;

create policy supplier_audit_criteria_select on public.supplier_audit_criteria
  for select using (organization_id = private.user_org_id() and private.user_is_manager());
create policy supplier_audit_criteria_insert on public.supplier_audit_criteria
  for insert with check (organization_id = private.user_org_id() and private.user_is_manager());
create policy supplier_audit_criteria_update on public.supplier_audit_criteria
  for update using (organization_id = private.user_org_id() and private.user_is_manager())
  with check (organization_id = private.user_org_id() and private.user_is_manager());
create policy supplier_audit_criteria_delete on public.supplier_audit_criteria
  for delete using (organization_id = private.user_org_id() and private.user_is_manager());

-- Auditorías realizadas — una fila por auditoría a un proveedor.
-- `responses` es un jsonb keyed por criterion_id: { value: 'cumple'|'no_cumple'|
-- 'no_aplica', notes: text }. El % de cumplimiento se calcula en el cliente
-- sobre los criterios aplicables (excluye 'no_aplica') — nunca se guarda como
-- columna derivada, mismo criterio que safety_indicators/safety risk zones.
create table if not exists public.supplier_audits (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  supplier_id      uuid not null references public.suppliers(id) on delete cascade,
  audit_date       date not null default current_date,
  auditor_name     text,
  responses        jsonb not null default '{}'::jsonb,
  overall_notes    text,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_supplier_audits_org on public.supplier_audits (organization_id);
create index if not exists idx_supplier_audits_supplier on public.supplier_audits (supplier_id);

create trigger supplier_audits_set_updated_at
  before update on public.supplier_audits
  for each row execute function set_updated_at();

alter table public.supplier_audits enable row level security;

create policy supplier_audits_select on public.supplier_audits
  for select using (organization_id = private.user_org_id() and private.user_is_manager());
create policy supplier_audits_insert on public.supplier_audits
  for insert with check (organization_id = private.user_org_id() and private.user_is_manager());
create policy supplier_audits_update on public.supplier_audits
  for update using (organization_id = private.user_org_id() and private.user_is_manager())
  with check (organization_id = private.user_org_id() and private.user_is_manager());
create policy supplier_audits_delete on public.supplier_audits
  for delete using (organization_id = private.user_org_id() and private.user_is_manager());
