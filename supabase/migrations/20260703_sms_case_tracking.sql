-- Seguimiento de casos SMS/VOR/MOR: acciones correctivas + línea de tiempo,
-- clasificación de severidad real para VOR/MOR (hoy solo sms_reports la tenía)
-- y notificación a AeroCivil para casos MOR.

-- Severidad de VOR/MOR — mismo vocabulario RAC 100 que ya usa sms_reports
-- (incidente/incidente_grave/accidente), no la escala Baja/Media/Alta/Crítica
-- del mockup, para no tener dos vocabularios de "severidad" distintos en la
-- misma tabla consolidada. Nullable: los reportes existentes no tienen
-- clasificación retroactiva — se muestran como "Sin clasificar" hasta que un
-- gerente SMS los clasifique.
alter table public.vor_mor_submissions
  add column if not exists severity text check (severity in ('incidente', 'incidente_grave', 'accidente')),
  add column if not exists aerocivil_notified_at timestamptz;

-- Acciones correctivas de un caso (sms_reports o vor_mor_submissions — exactamente uno).
create table if not exists public.sms_case_actions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  sms_report_id    uuid references public.sms_reports(id) on delete cascade,
  vor_mor_id       uuid references public.vor_mor_submissions(id) on delete cascade,
  label            text not null,
  owner            text,
  due_date         date,
  done             boolean not null default false,
  done_at          timestamptz,
  created_by       uuid,
  created_at       timestamptz not null default now(),
  constraint sms_case_actions_one_parent check (num_nonnulls(sms_report_id, vor_mor_id) = 1)
);
create index if not exists idx_sms_case_actions_sms  on public.sms_case_actions (sms_report_id);
create index if not exists idx_sms_case_actions_vor  on public.sms_case_actions (vor_mor_id);

-- Línea de tiempo del caso — eventos reales (creación, cambios de estado,
-- notificación AeroCivil), nunca narrativa fabricada. Se inserta desde las
-- rutas API que ya manejan cada transición (mismo patrón fire-and-forget de
-- lib/auditLog.js), no vía trigger.
create table if not exists public.sms_case_events (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  sms_report_id    uuid references public.sms_reports(id) on delete cascade,
  vor_mor_id       uuid references public.vor_mor_submissions(id) on delete cascade,
  label            text not null,
  actor_id         uuid,
  actor_name       text,
  created_at       timestamptz not null default now(),
  constraint sms_case_events_one_parent check (num_nonnulls(sms_report_id, vor_mor_id) = 1)
);
create index if not exists idx_sms_case_events_sms  on public.sms_case_events (sms_report_id, created_at);
create index if not exists idx_sms_case_events_vor  on public.sms_case_events (vor_mor_id, created_at);

alter table public.sms_case_actions enable row level security;
alter table public.sms_case_events  enable row level security;

-- Mismos roles que ya gestionan SMS (canManageSMS: superadmin/admin/gerente_sms).
create policy sms_case_actions_all on public.sms_case_actions
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

create policy sms_case_events_select on public.sms_case_events
  for select
  using (
    organization_id in (
      select organization_id from public.profiles
      where id = auth.uid() and role in ('superadmin', 'admin', 'gerente_sms')
    )
  );
-- Sin política de INSERT/UPDATE/DELETE → solo el service role escribe eventos
-- (las rutas API usan createAdminClient(), igual que audit_log).

-- Barreras de seguridad (mitigaciones/controles) — reemplaza la vista de solo
-- lectura basada en form_definitions con una entidad real editable.
create table if not exists public.safety_barriers (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  name                text not null,
  category            text not null check (category in ('Técnica', 'Procedimental', 'Humana', 'Organizacional')),
  description         text,
  hazard              text,
  sora_assessment_id  uuid references public.sora_assessments(id) on delete set null,
  responsible         text,
  status              text not null default 'Activa' check (status in ('Activa', 'En revisión', 'Retirada')),
  created_by          uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_safety_barriers_org on public.safety_barriers (organization_id);

alter table public.safety_barriers enable row level security;

create policy safety_barriers_all on public.safety_barriers
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
