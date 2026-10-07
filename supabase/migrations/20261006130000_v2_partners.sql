-- Skylog V2.0 — programa de socios (Etapa E de docs/skylog-v2/44-alta-y-socios.md): escuelas y asesores que regalan
-- perfiles gratis y cobran comisión recurrente. Mismo modelo que la versión actual, con las claves de V2:
-- `profile_id` → `person_id`, `org_id` → `organization_id`, `ref_payco` → `payment_reference` (referencia de Wompi).
-- Lectura: solo los miembros del socio (y sus filas); toda escritura la hace el servidor con la llave de servicio.

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('escuela', 'asesor')),
  name text not null,
  status text not null default 'activo' check (status in ('activo', 'inactivo')),
  parent_partner_id uuid references public.partners(id) on delete set null,
  commission_pct numeric not null default 0 check (commission_pct >= 0 and commission_pct <= 100),
  free_seats_limit integer check (free_seats_limit is null or free_seats_limit >= 0),
  free_seats_used integer not null default 0 check (free_seats_used >= 0),
  free_days integer not null default 90 check (free_days > 0),
  logo_url text,
  created_by uuid references public.people(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.partner_codes (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  code text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.partner_members (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  role text not null default 'asesor' check (role in ('owner', 'asesor')),
  created_at timestamptz not null default now(),
  unique (partner_id, person_id)
);

create table if not exists public.partner_invitations (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  email text not null,
  role text not null default 'asesor' check (role in ('owner', 'asesor')),
  token text not null unique,
  status text not null default 'pendiente' check (status in ('pendiente', 'aceptada', 'expirada', 'revocada')),
  invited_by uuid references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

-- Un regalo por correo, para siempre (regla «1 regalo por correo, no renovable»; solo Master puede reiniciar uno).
create table if not exists public.free_grants (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references public.partners(id) on delete set null,
  advisor_member_id uuid references public.partner_members(id) on delete set null,
  email text not null unique,
  plan text not null default 'piloto' check (plan in ('piloto', 'escuadrilla', 'flota', 'enterprise')),
  status text not null default 'enviado' check (status in ('enviado', 'activado', 'expirado', 'degradado', 'purgado')),
  token text not null unique,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  purge_after timestamptz,
  redeemed_organization_id uuid references public.organizations(id) on delete set null,
  welcome_shown_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references public.partners(id) on delete set null,
  advisor_member_id uuid references public.partner_members(id) on delete set null,
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  code text,
  plan text,
  billing text,
  status text not null default 'activa' check (status in ('activa', 'cancelada')),
  created_at timestamptz not null default now()
);

-- Una fila por ciclo de pago (comisión recurrente); idempotente por la referencia de pago.
create table if not exists public.referral_commissions (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  period text,
  sale_amount numeric,
  commission_pct numeric,
  commission_amount numeric,
  status text not null default 'pendiente' check (status in ('pendiente', 'liquidada', 'anulada')),
  payment_reference text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_codes_partner_idx on public.partner_codes (partner_id);
create index if not exists partner_members_person_idx on public.partner_members (person_id);
create index if not exists partner_invitations_partner_idx on public.partner_invitations (partner_id);
create index if not exists free_grants_partner_idx on public.free_grants (partner_id);
create index if not exists referrals_partner_idx on public.referrals (partner_id);
create index if not exists referral_commissions_referral_idx on public.referral_commissions (referral_id);

drop trigger if exists free_grants_touch on public.free_grants;
create trigger free_grants_touch before update on public.free_grants for each row execute function public.v2_touch_updated_at();
drop trigger if exists referral_commissions_touch on public.referral_commissions;
create trigger referral_commissions_touch before update on public.referral_commissions for each row execute function public.v2_touch_updated_at();

-- Socios a los que pertenece la persona de la sesión (y la escuela de la que cuelga cada asesor).
create or replace function public.v2_my_partner_ids()
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select partner_id from partner_members where person_id = public.v2_current_person_id()
$$;
revoke execute on function public.v2_my_partner_ids() from public, anon;
grant execute on function public.v2_my_partner_ids() to authenticated;

alter table public.partners enable row level security;
alter table public.partner_codes enable row level security;
alter table public.partner_members enable row level security;
alter table public.partner_invitations enable row level security;
alter table public.free_grants enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_commissions enable row level security;

create policy partners_member_read on public.partners for select to authenticated
  using (id in (select public.v2_my_partner_ids()) or parent_partner_id in (select public.v2_my_partner_ids()));
create policy partner_codes_member_read on public.partner_codes for select to authenticated
  using (partner_id in (select public.v2_my_partner_ids()));
create policy partner_members_member_read on public.partner_members for select to authenticated
  using (partner_id in (select public.v2_my_partner_ids()));
create policy free_grants_member_read on public.free_grants for select to authenticated
  using (partner_id in (select public.v2_my_partner_ids()));
create policy referrals_member_read on public.referrals for select to authenticated
  using (partner_id in (select public.v2_my_partner_ids()));
create policy referral_commissions_member_read on public.referral_commissions for select to authenticated
  using (referral_id in (select id from public.referrals where partner_id in (select public.v2_my_partner_ids())));
-- partner_invitations: sin política de lectura (solo servidor): el token es la capacidad.
