-- F3 — SMS: reportes de seguridad operacional + análisis de casos.
-- docs/skylog-v2/31-esquema-datos.md §4 · 40-sms.md §5.7 · 12-directivas-maut.md §2.
--
-- Separa DILIGENCIAR (cualquier persona, decisión 2026-08-22 en 40-sms.md §5.7)
-- de ANALIZAR (Gerente SMS, dueño nominal del caso) — dos etapas, dos tablas.
-- `route`/`requires_manager_analysis` se calculan server-side con
-- classifyReportRoute() de packages/domain — nunca se confía en el valor que
-- manda el cliente (regla S2). accidente/incidente_grave nunca crea un caso
-- MOR/VOR (bifurcan a RAC 114, §2.5) — se guarda el reporte como evidencia
-- pero `route='rac114'` y sin caso asociado hasta que el RAC 114 se diseñe
-- (pendiente documentado en 12-directivas-maut.md §2.5).

create table sms_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  reported_by uuid references people(id), -- nullable: anónimo permitido, diferido a UI futura
  severity text not null check (severity in ('incidente', 'incidente_grave', 'accidente')),
  route text not null check (route in ('mor', 'vor', 'rac114')),
  requires_manager_analysis boolean not null default false,
  event_code text, -- taxonomía UAS_MANDATORY_EVENTS si aplica, texto libre si no
  description text not null,
  confidentiality_level text not null default 'normal' check (confidentiality_level in ('normal', 'confidencial')),
  source text not null default 'manual' check (source in ('manual', 'auto_duty_exception')),
  analyzed_by uuid references people(id),
  analyzed_at timestamptz,
  filed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table sms_reports is '31-esquema-datos.md §4 — el reporte diligenciado. Lo puede crear cualquier persona (40-sms.md §5.7); analizarlo y radicarlo (filed_at) es función del Gerente SMS. `route`/`requires_manager_analysis` son un snapshot calculado server-side al crear — no cambian si la severidad se reclasifica después (evidencia histórica, clase ④).';

create index sms_reports_org_idx on sms_reports (organization_id);

create table sms_cases (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references sms_reports(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  assigned_to uuid references people(id), -- el Gerente SMS designado (40-sms.md §5.7 punto 2)
  status text not null default 'abierto' check (status in ('abierto', 'en_analisis', 'cerrado')),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table sms_cases is '31-esquema-datos.md §4 — el análisis, separado del reporte. `assigned_to` es el dueño nominal (40-sms.md §5.7): un caso sin analista asignado es un caso sin dueño.';

create index sms_cases_org_idx on sms_cases (organization_id);

create table sms_case_actions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references sms_cases(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  description text not null,
  responsible_id uuid references people(id),
  due_date date,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table sms_case_actions is '31-esquema-datos.md §4 — acciones correctivas de un caso. Patrón ya probado en producción (sms_case_actions).';

create index sms_case_actions_case_idx on sms_case_actions (case_id);

create table sms_case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references sms_cases(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references people(id),
  created_at timestamptz not null default now()
);

comment on table sms_case_events is '31-esquema-datos.md §4 — línea de tiempo append-only. Patrón ya probado en producción (sms_case_events) — nunca se edita ni se borra un evento.';

create index sms_case_events_case_idx on sms_case_events (case_id);

alter table sms_reports enable row level security;
alter table sms_cases enable row level security;
alter table sms_case_actions enable row level security;
alter table sms_case_events enable row level security;

-- sms_reports: cualquier miembro de la organización puede crear (decisión
-- §5.7 — "diligenciar" es abierto por diseño, no por descuido); ve los suyos
-- o, si es gestor SMS, todos los de la organización.
create policy sms_reports_select on sms_reports
  for select using (
    reported_by = v2_current_person_id()
    or v2_is_duty_manager(organization_id)
  );

create policy sms_reports_insert on sms_reports
  for insert with check (organization_id in (select v2_current_organization_ids()));

-- Sin UPDATE: clase ④ evento — corregir un reporte es un caso/evento nuevo, no
-- reescribir el original.

-- sms_cases/actions/events: solo un gestor (mismo helper que F5/F4a —
-- v2_is_duty_manager cubre admin/jefe_pilotos/gerente_sms/superadmin; el
-- filtro fino a "solo Gerente SMS" para asignar es responsabilidad de la API,
-- no de RLS, igual que el resto de gates de rol del proyecto).
create policy sms_cases_select on sms_cases
  for select using (v2_is_duty_manager(organization_id));

create policy sms_cases_insert on sms_cases
  for insert with check (v2_is_duty_manager(organization_id));

create policy sms_cases_update on sms_cases
  for update using (v2_is_duty_manager(organization_id))
  with check (v2_is_duty_manager(organization_id));

create policy sms_case_actions_select on sms_case_actions
  for select using (v2_is_duty_manager(organization_id));

create policy sms_case_actions_insert on sms_case_actions
  for insert with check (v2_is_duty_manager(organization_id));

create policy sms_case_actions_update on sms_case_actions
  for update using (v2_is_duty_manager(organization_id))
  with check (v2_is_duty_manager(organization_id));

create policy sms_case_events_select on sms_case_events
  for select using (v2_is_duty_manager(organization_id));

create policy sms_case_events_insert on sms_case_events
  for insert with check (v2_is_duty_manager(organization_id));
