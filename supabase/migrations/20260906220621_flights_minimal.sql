-- Skylog V2.0 — entidad Operación, forma mínima: `flights` (30-entidades.md §4 ·
-- 31-esquema-datos.md §3). "El evento único" — libro de vuelo y bitácora del
-- piloto son vistas sobre esta tabla, no tablas separadas (a diferencia de v1).
--
-- Se construye ahora, fuera de orden respecto al plan original de frentes,
-- porque F5 (100.540(c)(1)/(d)(1) — límites de horas de vuelo mensual/diario)
-- depende de datos reales de vuelo para evaluar cumplimiento — sin esto,
-- checkMonthlyFlightHours/checkDailyFlightHours de packages/domain no tenían
-- ningún dato que leer. Decisión del usuario, 2026-09-06.
--
-- `aircraft_id`/`mission_id`/`weather_observation_id` son uuid SIN foreign key
-- todavía: Flota y Operación completa (autorizaciones, misiones) no existen en
-- este esquema de desarrollo — mismo criterio ya aplicado en duty_periods.

create table flights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  pilot_person_id uuid not null references people(id),
  aircraft_id uuid,
  mission_id uuid,
  takeoff_at timestamptz not null,
  landing_at timestamptz not null,
  total_time numeric(6,2) not null,
  visual_condition text check (visual_condition in ('VLOS', 'EVLOS', 'BVLOS')),
  mission_type text,
  weather_observation_id uuid,
  replay_path text,
  created_at timestamptz not null default now(),
  constraint flights_landing_after_takeoff check (landing_at > takeoff_at),
  constraint flights_total_time_positive check (total_time > 0)
);

comment on table flights is '30-entidades.md §4 / 31-esquema-datos.md §3 — el evento único de vuelo. Libro de vuelo y bitácora del piloto son vistas sobre esta tabla, no tablas separadas. Forma mínima: solo los campos que F5 necesita para evaluar §100.540(c)(1)/(d)(1); crece por migración aditiva cuando Flota/Programación se construyan.';

create index flights_pilot_takeoff_idx on flights (pilot_person_id, takeoff_at);
create index flights_org_idx on flights (organization_id);

alter table flights enable row level security;

-- Mismo patrón de RLS que duty_periods (decisión 34/35): el propio piloto ve/crea
-- los suyos; un gestor (admin/jefe_pilotos/gerente_sms/superadmin) ve/gestiona
-- todos los de su organización. Reutiliza los helpers ya creados y con EXECUTE
-- revocado (v2_current_person_id, v2_is_duty_manager).

create policy flights_select on flights
  for select using (
    pilot_person_id = v2_current_person_id()
    or v2_is_duty_manager(organization_id)
  );

create policy flights_insert on flights
  for insert with check (
    pilot_person_id = v2_current_person_id()
    or v2_is_duty_manager(organization_id)
  );

-- Clase ④ evento (30-entidades.md §1): no se edita, se corrige con otro evento.
-- Sin política de UPDATE/DELETE — deny-all por defecto, a propósito.
