-- Área de Capacitación y Examen — a pedido del usuario, página propia
-- (`/capacitacion`), distinta del cronograma SMS de asistencia (sms_training_*,
-- que no califica ni bloquea). Aquí sí hay examen calificado con banco de
-- preguntas, intentos por ciclo y umbral de aprobación — mismo espíritu que
-- el módulo de Capacitación de pilotos ya probado en producción, reconstruido
-- para el modelo de identidad de V2 (people/memberships).
--
-- `training_exam_questions.correct_index` NUNCA debe llegar al cliente
-- mientras responde — por eso la tabla tiene RLS de solo-gestor incluso para
-- SELECT; la ruta que sirve el examen a quien lo presenta usa el cliente
-- admin (service role) server-side y arma la respuesta sin ese campo.

create table training_exams (
  organization_id uuid primary key references organizations(id) on delete cascade,
  passing_score numeric(5,2) not null check (passing_score between 0 and 100),
  max_attempts int not null check (max_attempts > 0),
  recurrence text not null check (recurrence in ('semanal', 'quincenal', 'mensual', 'personalizado')),
  recurrence_days int check (recurrence_days > 0),
  start_date date not null,
  created_by uuid references people(id),
  created_at timestamptz not null default now(),
  constraint training_exams_custom_days check (
    (recurrence = 'personalizado' and recurrence_days is not null) or
    (recurrence <> 'personalizado')
  )
);

comment on table training_exams is 'Configuración del examen calificado — una por organización (área de Capacitación y Examen, página propia a pedido del usuario). passing_score/max_attempts/recurrence son públicos para los miembros (necesitan saber la regla); correct_index de las preguntas nunca lo es.';

create table training_exam_questions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  question text not null,
  options jsonb not null,
  correct_index int not null,
  order_index int not null default 0,
  created_by uuid references people(id),
  created_at timestamptz not null default now()
);

comment on table training_exam_questions is 'Banco de preguntas de opción múltiple. RLS restringida a gestores incluso para SELECT — un piloto nunca debe poder leer correct_index vía Supabase directo; la ruta de examen usa el cliente admin server-side.';

create index training_exam_questions_org_idx on training_exam_questions (organization_id);

create table training_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  person_id uuid not null references people(id),
  cycle_start date not null,
  attempt_number int not null,
  answers jsonb not null,
  score numeric(5,2) not null,
  passed boolean not null,
  created_at timestamptz not null default now(),
  unique (person_id, cycle_start, attempt_number)
);

comment on table training_exam_attempts is 'Intento calificado — score/passed se calculan server-side con gradeAttempt() de packages/domain, nunca se aceptan del cliente (regla S2).';

create index training_exam_attempts_person_idx on training_exam_attempts (person_id);
create index training_exam_attempts_org_idx on training_exam_attempts (organization_id);

alter table training_exams enable row level security;
alter table training_exam_questions enable row level security;
alter table training_exam_attempts enable row level security;

-- training_exams: cualquier miembro ve la regla (passing_score/max_attempts/
-- recurrencia) — necesita saberla para entender su propio cumplimiento;
-- solo gestores la configuran.
create policy training_exams_select on training_exams
  for select using (organization_id in (select v2_current_organization_ids()));

create policy training_exams_upsert on training_exams
  for insert with check (v2_is_duty_manager(organization_id));

create policy training_exams_update on training_exams
  for update using (v2_is_duty_manager(organization_id))
  with check (v2_is_duty_manager(organization_id));

-- training_exam_questions: SOLO gestores, ni siquiera SELECT para el resto —
-- el examen se sirve por una ruta server-side con el cliente admin, no por
-- consulta directa de un piloto.
create policy training_exam_questions_select on training_exam_questions
  for select using (v2_is_duty_manager(organization_id));

create policy training_exam_questions_insert on training_exam_questions
  for insert with check (v2_is_duty_manager(organization_id));

-- training_exam_attempts: la persona ve los suyos; un gestor ve todos los de
-- su organización (mismo criterio que duty_periods/flights de F5).
create policy training_exam_attempts_select on training_exam_attempts
  for select using (
    person_id = v2_current_person_id()
    or v2_is_duty_manager(organization_id)
  );

-- El INSERT lo hace la ruta de examen con el cliente admin (mismo patrón que
-- production's api/training/exam) — sin política de INSERT para authenticated:
-- la elegibilidad (ciclo/intentos restantes) se valida en la API, no en RLS,
-- porque requiere lógica de packages/domain que SQL no puede expresar.
