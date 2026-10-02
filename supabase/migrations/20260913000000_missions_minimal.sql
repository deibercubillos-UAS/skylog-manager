-- Skylog V2.0 — entidad Operación: `missions` (30-entidades.md §4 · 31-esquema-datos.md §3,
-- "Lo programado"). Documentada desde el rediseño del esquema (2026-08-22) pero nunca creada —
-- se construye ahora porque Programación (Operación) la necesita.
--
-- Forma deliberadamente mínima, mismo criterio que `flights` (20260906220621_flights_minimal.sql):
-- `aircraft_id`/`authorization_id` son uuid SIN foreign key todavía — Flota y las solicitudes de
-- autorización formal (`authorization_requests`) no existen en este esquema de desarrollo. `zone`
-- es texto libre por la misma razón (sin geometría de zona todavía, a diferencia de v1 `plan_data`).
-- Decisión del usuario, 2026-09-13: vista de calendario semanal en la UI, mismo alcance de
-- backend que una lista simple.

create table missions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  pic_person_id uuid not null references people(id),
  aircraft_id uuid,
  authorization_id uuid,
  zone text not null,
  scheduled_at timestamptz not null,
  status text not null default 'programada' check (status in ('programada', 'cancelada')),
  notes text,
  created_at timestamptz not null default now()
);

comment on table missions is '30-entidades.md §4 / 31-esquema-datos.md §3 — lo programado. Forma mínima: sin aeronave real (Flota no existe todavía) ni autorización formal; crece por migración aditiva cuando esas entidades se construyan.';

create index missions_org_scheduled_idx on missions (organization_id, scheduled_at);
create index missions_pic_scheduled_idx on missions (pic_person_id, scheduled_at);

alter table missions enable row level security;

-- Mismo patrón de RLS que flights/duty_periods: el PIC asignado ve sus propias misiones;
-- un gestor (admin/jefe_pilotos/gerente_sms/superadmin) ve y programa todas las de su
-- organización. Programar es una función de gestión (mismo criterio que v1
-- PERMISSIONS.canManageOps para Programación) — un PIC no se autoprograma.
create policy missions_select on missions
  for select using (
    pic_person_id = v2_current_person_id()
    or v2_is_duty_manager(organization_id)
  );

create policy missions_insert on missions
  for insert with check (
    v2_is_duty_manager(organization_id)
  );

-- Cancelar una misión ya programada: solo un gestor, y solo el campo `status`/`notes` en la
-- práctica (la API no expone ningún otro campo editable) — reutiliza la misma política amplia
-- de UPDATE porque no hay otro caso de escritura sobre esta tabla hoy.
create policy missions_update on missions
  for update using (
    v2_is_duty_manager(organization_id)
  );
