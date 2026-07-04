-- Plan de Capacitación del SMS — cronograma + roster de asistencia (Fase 7
-- del plan de mejora SMS, ver docs/plan-mejora-sms-bitafly.md y CLAUDE.md
-- "Seguridad SMS"). Circular MAUT-5.0-22-017, apartado de Instrucción y
-- Educación — dirigido a TODO el personal (profiles), no solo pilotos, a
-- diferencia del módulo "Capacitación" (Operaciones/Mantenimiento) ya
-- existente. Solo asistencia — sin examen (decisión confirmada).

-- ── Cronograma de sesiones ───────────────────────────────────────────────
-- Mismo patrón que training_sessions (Capacitación v2) pero tabla propia:
-- sin `type` (un solo público, todo el personal) y con su propia RLS.
create table if not exists public.sms_training_sessions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  topic            text not null,
  recurrence       text not null check (recurrence in ('semanal', 'quincenal', 'mensual', 'personalizado')),
  recurrence_days  int,
  start_date       date not null default current_date,
  notes            text,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_sms_training_sessions_org on public.sms_training_sessions (organization_id);

alter table public.sms_training_sessions enable row level security;

create policy sms_training_sessions_all on public.sms_training_sessions
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

-- ── Roster de asistencia ───────────────────────────────────────────────────
-- Una fila por (sesión, persona, fecha de la ocurrencia) — permite marcar
-- asistencia en cada ocurrencia real de una sesión recurrente, no solo una
-- vez por sesión. profile_id (no pilot_id): el público es todo el personal.
create table if not exists public.sms_training_attendance (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  session_id       uuid not null references public.sms_training_sessions(id) on delete cascade,
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  attended_date    date not null,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz not null default now(),
  unique (session_id, profile_id, attended_date)
);
create index if not exists idx_sms_training_attendance_org on public.sms_training_attendance (organization_id);
create index if not exists idx_sms_training_attendance_session on public.sms_training_attendance (session_id);

alter table public.sms_training_attendance enable row level security;

create policy sms_training_attendance_all on public.sms_training_attendance
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
