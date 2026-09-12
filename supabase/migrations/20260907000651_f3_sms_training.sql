-- F3 — Capacitación SMS: cronograma recurrente + asistencia.
-- docs/skylog-v2/40-sms.md §5.2 fase 4. Distinta de la capacitación de
-- pilotos con examen calificado (fuera de alcance de F3): aquí es todo el
-- personal (people con membresía activa), sin examen, solo cronograma +
-- asistencia registrada — mismo criterio que producción
-- (sms_training_sessions/sms_training_attendance, roster sobre profiles no
-- pilots).

create table sms_training_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  topic text not null,
  recurrence text not null check (recurrence in ('semanal', 'quincenal', 'mensual', 'personalizado')),
  recurrence_days int check (recurrence_days > 0),
  start_date date not null,
  created_by uuid references people(id),
  created_at timestamptz not null default now(),
  constraint sms_training_sessions_custom_days check (
    (recurrence = 'personalizado' and recurrence_days is not null) or
    (recurrence <> 'personalizado')
  )
);

comment on table sms_training_sessions is '40-sms.md §5.2 fase 4 — cronograma recurrente de capacitación SMS. Las fechas reales de ocurrencia se proyectan con occurrencesInRange()/nextOccurrence() de packages/domain, nunca se guarda una fila por ocurrencia futura.';

create index sms_training_sessions_org_idx on sms_training_sessions (organization_id);

create table sms_training_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sms_training_sessions(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  person_id uuid not null references people(id),
  occurrence_date date not null, -- a cuál ocurrencia proyectada corresponde esta asistencia
  attended_at timestamptz not null default now(),
  recorded_by uuid references people(id),
  unique (session_id, person_id, occurrence_date)
);

comment on table sms_training_attendance is '40-sms.md §5.2 fase 4 — asistencia real registrada por sesión/persona/ocurrencia. Roster = cualquier persona con membresía activa en la organización, no solo pilotos.';

create index sms_training_attendance_session_idx on sms_training_attendance (session_id);
create index sms_training_attendance_org_idx on sms_training_attendance (organization_id);

alter table sms_training_sessions enable row level security;
alter table sms_training_attendance enable row level security;

-- Lectura para cualquier miembro (transparencia); escritura solo gestores.
create policy sms_training_sessions_select on sms_training_sessions
  for select using (organization_id in (select v2_current_organization_ids()));

create policy sms_training_sessions_insert on sms_training_sessions
  for insert with check (v2_is_duty_manager(organization_id));

create policy sms_training_attendance_select on sms_training_attendance
  for select using (organization_id in (select v2_current_organization_ids()));

create policy sms_training_attendance_insert on sms_training_attendance
  for insert with check (v2_is_duty_manager(organization_id));
