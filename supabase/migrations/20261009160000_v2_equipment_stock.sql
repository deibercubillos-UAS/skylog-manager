-- Skylog V2.0 — existencias de equipo de operación (chalecos, botiquín, extintor, conos…): una fila por TIPO de equipo con
-- su cantidad agregada. Distinto de `aircraft`/`batteries`/`eta_items` (que llevan identidad por serie). Lectura para
-- cualquier miembro de la organización; escritura solo para gestores (mismo criterio que `eta_items`).
create table if not exists public.equipment_stock (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  category text,
  quantity integer not null default 0 check (quantity >= 0),
  notes text,
  created_by uuid references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists equipment_stock_org_idx on public.equipment_stock (organization_id);
create trigger equipment_stock_touch before update on public.equipment_stock
  for each row execute function public.v2_touch_updated_at();
alter table public.equipment_stock enable row level security;
create policy equipment_stock_select on public.equipment_stock as permissive for select to public
  using (organization_id in (select public.v2_current_organization_ids()));
create policy equipment_stock_insert on public.equipment_stock as permissive for insert to public
  with check (public.v2_is_duty_manager(organization_id));
create policy equipment_stock_update on public.equipment_stock as permissive for update to public
  using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy equipment_stock_delete on public.equipment_stock as permissive for delete to public
  using (public.v2_is_duty_manager(organization_id));
revoke all on table public.equipment_stock from anon, authenticated, service_role;
grant select, insert, update, delete on table public.equipment_stock to authenticated;
grant all on table public.equipment_stock to service_role;
