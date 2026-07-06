-- Fase 0 del refactor multi-organización: tabla de membresías + organización
-- activa + backfill + trigger-puente. Cero cambios de comportamiento: el
-- backfill es 1:1 con profiles y ninguna función/ruta lee esta tabla todavía
-- (eso ocurre en fases posteriores). Ver CLAUDE.md "Multi-organización por
-- cuenta".

create table if not exists public.organization_members (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  organization_id          uuid not null references public.organizations(id) on delete cascade,
  role                     text not null default 'piloto',
  subscription_plan        text not null default 'piloto',
  epayco_customer_id       text,
  epayco_subscription_id   text,
  epayco_ref               text,
  subscription_expires_at  timestamptz,
  subscription_status      text default 'active',
  last_payment_date        date,
  is_active                boolean not null default true, -- membresía vigente (no revocada) — NO es "organización actualmente seleccionada" (eso vive en profiles.active_organization_id)
  joined_at                timestamptz not null default now(),
  unique (user_id, organization_id)
);

create index if not exists idx_organization_members_org on public.organization_members (organization_id);

alter table public.organization_members enable row level security;

-- RLS mínima, sin pasar por las funciones private.* (son SECURITY DEFINER y
-- ya evitan RLS al leer profiles hoy; que dependan de esta tabla y esta
-- tabla dependa de ellas crearía riesgo de recursión sin beneficio real).
create policy organization_members_select_own on public.organization_members
  for select using (user_id = auth.uid());

alter table public.profiles add column if not exists active_organization_id uuid references public.organizations(id);

-- Backfill 1:1 — comportamiento idéntico a hoy para todas las cuentas.
insert into public.organization_members
  (user_id, organization_id, role, subscription_plan, epayco_customer_id, epayco_subscription_id, epayco_ref, subscription_expires_at, subscription_status, last_payment_date, is_active, joined_at)
select id, organization_id, coalesce(role, 'piloto'), coalesce(subscription_plan, 'piloto'), epayco_customer_id, epayco_subscription_id, epayco_ref, subscription_expires_at, subscription_status, last_payment_date, true, coalesce(created_at, now())
from public.profiles
where organization_id is not null
on conflict (user_id, organization_id) do nothing;

update public.profiles set active_organization_id = organization_id where organization_id is not null;

-- Trigger-puente: cualquier escritura legacy a profiles (de los ~14 sitios
-- que hoy escriben role/organization_id/plan/ePayco) se refleja aquí sola,
-- para que las fases siguientes se puedan desplegar en cualquier orden sin
-- un "flag day". Idempotente (upsert).
create or replace function private.sync_profile_to_org_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.organization_id is not null then
    insert into public.organization_members
      (user_id, organization_id, role, subscription_plan, epayco_customer_id, epayco_subscription_id, epayco_ref, subscription_expires_at, subscription_status, last_payment_date, is_active)
    values
      (new.id, new.organization_id, coalesce(new.role, 'piloto'), coalesce(new.subscription_plan, 'piloto'), new.epayco_customer_id, new.epayco_subscription_id, new.epayco_ref, new.subscription_expires_at, new.subscription_status, new.last_payment_date, true)
    on conflict (user_id, organization_id) do update set
      role = excluded.role,
      subscription_plan = excluded.subscription_plan,
      epayco_customer_id = excluded.epayco_customer_id,
      epayco_subscription_id = excluded.epayco_subscription_id,
      epayco_ref = excluded.epayco_ref,
      subscription_expires_at = excluded.subscription_expires_at,
      subscription_status = excluded.subscription_status,
      last_payment_date = excluded.last_payment_date;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_profile_to_org_member on public.profiles;
create trigger trg_sync_profile_to_org_member
  after insert or update of organization_id, role, subscription_plan, epayco_customer_id, epayco_subscription_id, epayco_ref, subscription_expires_at, subscription_status, last_payment_date
  on public.profiles
  for each row
  execute function private.sync_profile_to_org_member();
