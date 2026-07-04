-- Evaluación y Gestión de Riesgos de Seguridad Operacional (Fase 2 del plan
-- de mejora SMS, ver docs/plan-mejora-sms-bitafly.md y CLAUDE.md "Seguridad
-- SMS"). Matriz 5x5 (probabilidad x gravedad) personalizable por
-- organización + registro de peligros — Circular MAUT-5.0-22-017, apartado
-- "ii. Evaluación y gestión de riesgos de seguridad operacional".

-- ── Escalas de Probabilidad (1-5) y Gravedad (A-E), personalizables ────────
create table if not exists public.safety_risk_scales (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  dimension        text not null check (dimension in ('probabilidad', 'gravedad')),
  code             text not null,          -- '1'..'5' para probabilidad, 'A'..'E' para gravedad
  order_index      int not null,           -- 1 (más bajo) .. 5 (más alto), para ordenar
  label            text not null,          -- ej. "Frecuente", "Catastrófico"
  description      text,                   -- criterio editable, ej. "10 eventos por cada 100 vuelos"
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, dimension, code)
);
create index if not exists idx_safety_risk_scales_org on public.safety_risk_scales (organization_id);

alter table public.safety_risk_scales enable row level security;

create policy safety_risk_scales_all on public.safety_risk_scales
  for all
  using (
    organization_id in (
      select organization_id from public.profiles
      where id = auth.uid() and role in ('superadmin', 'admin', 'gerente_sms')
    )
  )
  with check (
    organization_id in (
      select organization_id from public.profiles
      where id = auth.uid() and role in ('superadmin', 'admin', 'gerente_sms')
    )
  );

-- ── Matriz de tolerabilidad: zona por cada una de las 25 celdas ───────────
create table if not exists public.safety_risk_tolerability (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  probability_code  text not null,   -- '1'..'5'
  severity_code     text not null,   -- 'A'..'E'
  zone              text not null check (zone in ('inaceptable', 'tolerable', 'aceptable')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (organization_id, probability_code, severity_code)
);
create index if not exists idx_safety_risk_tolerability_org on public.safety_risk_tolerability (organization_id);

alter table public.safety_risk_tolerability enable row level security;

create policy safety_risk_tolerability_all on public.safety_risk_tolerability
  for all
  using (
    organization_id in (
      select organization_id from public.profiles
      where id = auth.uid() and role in ('superadmin', 'admin', 'gerente_sms')
    )
  )
  with check (
    organization_id in (
      select organization_id from public.profiles
      where id = auth.uid() and role in ('superadmin', 'admin', 'gerente_sms')
    )
  );

-- ── Registro de peligros ───────────────────────────────────────────────────
-- La mitigación se captura como texto libre (mitigation) — sin FK obligatoria
-- a safety_barriers (decisión confirmada con el usuario, ver plan de mejora
-- SMS). source_ref_id queda sin FK (referencia libre a distintas tablas según
-- `source`: hallazgo GAP, evento SPI, caso VOR/MOR) — se resuelve en fases
-- futuras (3, 4) cuando esas tablas existan.
create table if not exists public.safety_hazards (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid not null references public.organizations(id) on delete cascade,
  description               text not null,
  source                    text not null default 'manual' check (source in ('manual', 'gap', 'spi', 'vormor')),
  source_ref_id             uuid,
  initial_probability_code  text not null,
  initial_severity_code     text not null,
  mitigation                text,
  residual_probability_code text,
  residual_severity_code    text,
  responsible               text,
  due_date                  date,
  status                    text not null default 'abierto' check (status in ('abierto', 'mitigado', 'cerrado')),
  created_by                uuid references public.profiles(id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index if not exists idx_safety_hazards_org on public.safety_hazards (organization_id);

alter table public.safety_hazards enable row level security;

create policy safety_hazards_all on public.safety_hazards
  for all
  using (
    organization_id in (
      select organization_id from public.profiles
      where id = auth.uid() and role in ('superadmin', 'admin', 'gerente_sms')
    )
  )
  with check (
    organization_id in (
      select organization_id from public.profiles
      where id = auth.uid() and role in ('superadmin', 'admin', 'gerente_sms')
    )
  );
