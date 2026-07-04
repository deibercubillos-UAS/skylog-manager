-- Indicadores de Desempeño en Seguridad Operacional — SPI (Fase 3 del plan
-- de mejora SMS, ver docs/plan-mejora-sms-bitafly.md y CLAUDE.md "Seguridad
-- SMS"). Circular MAUT-1.0-22-005 + Excel MAUT-1.0-12-002 — catálogo de
-- indicadores, datos mensuales (denominador + eventos) y planes de acción
-- (defensa/causa raíz/desencadenante). Tasas y líneas de alerta se calculan
-- en el cliente, no se guardan como columnas derivadas (mismo patrón que
-- Fase 2 — Evaluación de Riesgos).

-- ── Catálogo de indicadores ─────────────────────────────────────────────────
create table if not exists public.safety_indicators (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid not null references public.organizations(id) on delete cascade,
  name                      text not null,
  -- Lista fija de las 4 unidades de denominador de la circular (según tipo
  -- de proveedor) — no texto libre, para preservar la consistencia que exige
  -- la circular ("el mismo denominador para todos los indicadores del mismo
  -- tipo de proveedor").
  denominator_unit          text not null check (denominator_unit in ('ciclos_vuelo', 'horas_vuelo', 'horas_hombre', 'operaciones')),
  expected_improvement_pct  numeric not null default 0.1,
  created_by                uuid references public.profiles(id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index if not exists idx_safety_indicators_org on public.safety_indicators (organization_id);

alter table public.safety_indicators enable row level security;

create policy safety_indicators_all on public.safety_indicators
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

-- ── Datos mensuales por indicador ────────────────────────────────────────
create table if not exists public.safety_indicator_monthly (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  indicator_id      uuid not null references public.safety_indicators(id) on delete cascade,
  period            text not null check (period ~ '^\d{4}-(0[1-9]|1[0-2])$'), -- 'YYYY-MM'
  denominator_value numeric not null default 0,
  event_count       int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (indicator_id, period)
);
create index if not exists idx_safety_indicator_monthly_org on public.safety_indicator_monthly (organization_id);
create index if not exists idx_safety_indicator_monthly_indicator on public.safety_indicator_monthly (indicator_id);

alter table public.safety_indicator_monthly enable row level security;

create policy safety_indicator_monthly_all on public.safety_indicator_monthly
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

-- ── Planes de acción por indicador (defensa/causa raíz/desencadenante) ───
-- Fase 5 (Acciones Correctivas) agrega estas filas en su tablero consolidado
-- por agregación — no se duplica una tabla de acciones aparte.
create table if not exists public.safety_indicator_actions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  indicator_id    uuid not null references public.safety_indicators(id) on delete cascade,
  defense_type    text check (defense_type in ('T', 'R', 'E')), -- Tecnología / Reglamentación interna / Entrenamiento
  root_cause      text,
  trigger_factor  text,
  action_plan     text not null,
  document_ref    text,
  execution_days  int,
  status          text not null default 'pendiente' check (status in ('pendiente', 'en_progreso', 'completado')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_safety_indicator_actions_org on public.safety_indicator_actions (organization_id);
create index if not exists idx_safety_indicator_actions_indicator on public.safety_indicator_actions (indicator_id);

alter table public.safety_indicator_actions enable row level security;

create policy safety_indicator_actions_all on public.safety_indicator_actions
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

-- ── Rastro de envío anual a Aerocivil (vence 30 de marzo) ─────────────────
-- Mismo patrón que aerocivil_monthly_reports.
create table if not exists public.safety_indicator_submissions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  year            int not null,
  sent_at         timestamptz,
  sent_by         uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  unique (organization_id, year)
);

alter table public.safety_indicator_submissions enable row level security;

create policy safety_indicator_submissions_all on public.safety_indicator_submissions
  for all using (
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
