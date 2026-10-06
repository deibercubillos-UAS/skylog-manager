-- Skylog V2.0 — Despacho y Cierre de vuelo (RAC 100 §100.535(23); docs/skylog-v2/36-sitemap.md §2 ①).
-- Solo para el Supabase branch `develop-v2` (regla O1): NUNCA se aplica a producción.
--
-- Flujo: misión `programada` → DESPACHO (verificaciones + listas de chequeo + riesgos) →
-- misión `despachada` → CIERRE (se crea el vuelo, enlazado a la misión) → misión `cerrada`.
--
-- Diseño de seguridad: el despacho y su constancia los escribe SOLO el servidor (service role),
-- por dos RPC atómicas. Ningún usuario tiene política de INSERT/UPDATE sobre estas tablas, así
-- nadie puede falsear desde PostgREST que las verificaciones salieron "ok". Un despacho no se
-- puede borrar (retención de 5 años), por eso la creación es una sola transacción: no hay
-- "deshacer a mano" si un paso falla a medias.

-- 1) La misión ahora recorre el ciclo completo.
alter table missions drop constraint if exists missions_status_check;
alter table missions
  add constraint missions_status_check
  check (status in ('programada', 'despachada', 'cerrada', 'cancelada'));

-- 2) El vuelo referencia la misión (la columna ya existía, sin FK; verificado: 0 filas la usan).
alter table flights
  add constraint flights_mission_id_fkey foreign key (mission_id) references missions(id);
create unique index if not exists flights_mission_id_unique on flights (mission_id) where mission_id is not null;

-- 3) Constancia del despacho. Una misión = un despacho (varias salidas = varias misiones).
create table if not exists dispatches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  mission_id uuid not null unique references missions(id),
  pilot_person_id uuid not null references people(id),
  aircraft_id uuid references aircraft(id),
  dispatched_at timestamptz not null default now(),
  -- Instantánea de lo que el SISTEMA verificó al despachar: [{id, status, blocking, message}].
  gates jsonb not null default '[]'::jsonb,
  -- Evaluación de riesgos del despacho (matriz interna, configurable — regla C3; no es el
  -- formato oficial MAUT-5.0-12-055, que va por autorización).
  risk_evaluated boolean not null default false,
  risk_probability_code integer,
  risk_severity_code text,
  risk_initial_zone text,
  risk_mitigation text,
  risk_mitigation_voluntary boolean not null default false,
  risk_residual_probability_code integer,
  risk_residual_severity_code text,
  risk_residual_zone text,
  status text not null default 'despachado' check (status in ('despachado', 'cerrado')),
  flight_id uuid unique references flights(id),
  closed_at timestamptz,
  close_notes text,
  safety_report boolean,
  safety_report_type text check (safety_report_type in ('VOR', 'MOR')),
  created_at timestamptz not null default now(),
  constraint dispatches_close_consistent check (
    (status = 'cerrado') = (flight_id is not null and closed_at is not null)
  ),
  constraint dispatches_safety_type_consistent check (
    safety_report is distinct from true or safety_report_type is not null
  )
);
comment on table dispatches is '36-sitemap.md §2 ① Despacho — constancia inmutable (clase ④). Solo la escribe el servidor vía v2_dispatch_create / v2_dispatch_close. Retención de 5 años (v2_enforce_retention).';

create table if not exists dispatch_checklist_items (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references dispatches(id),
  organization_id uuid not null references organizations(id) on delete cascade,
  checklist_id uuid references checklists(id) on delete set null,
  checklist_name text not null,
  checklist_version text,
  position integer not null,
  step_text text not null,
  value text not null check (value in ('si', 'no', 'na')),
  note text,
  created_at timestamptz not null default now()
);
comment on table dispatch_checklist_items is 'Una fila por paso de cada lista de chequeo diligenciada en un despacho. Relacional a propósito (no jsonb): 21-auditoria-sms.md §7 señala que los results_* de v1 "se guardan y nunca se leen agregadamente"; aquí un paso marcado "no" de forma repetida se puede consultar. step_text es copia: la lista puede cambiar después, la evidencia no.';

create index if not exists dispatches_org_date_idx on dispatches (organization_id, dispatched_at desc);
create index if not exists dispatches_pilot_idx on dispatches (pilot_person_id, dispatched_at desc);
create index if not exists dispatch_items_dispatch_idx on dispatch_checklist_items (dispatch_id);
create index if not exists dispatch_items_no_idx on dispatch_checklist_items (organization_id, checklist_id) where value = 'no';

-- 4) Inmutabilidad: los pasos nunca cambian; el despacho solo admite UNA transición (cierre).
create or replace function v2_dispatch_items_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception using errcode = '23001', message = 'Los pasos de un despacho son evidencia y no se pueden modificar.';
end;
$$;
create trigger dispatch_items_no_update before update on dispatch_checklist_items for each row execute function v2_dispatch_items_immutable();

create or replace function v2_dispatch_close_only()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'cerrado' then
    raise exception using errcode = '23001', message = 'Este despacho ya está cerrado y no admite cambios.';
  end if;
  if new.status <> 'cerrado' then
    raise exception using errcode = '23001', message = 'Un despacho solo puede modificarse para cerrarlo.';
  end if;
  if new.organization_id is distinct from old.organization_id
     or new.mission_id is distinct from old.mission_id
     or new.pilot_person_id is distinct from old.pilot_person_id
     or new.aircraft_id is distinct from old.aircraft_id
     or new.dispatched_at is distinct from old.dispatched_at
     or new.gates is distinct from old.gates
     or new.risk_evaluated is distinct from old.risk_evaluated
     or new.risk_probability_code is distinct from old.risk_probability_code
     or new.risk_severity_code is distinct from old.risk_severity_code
     or new.risk_initial_zone is distinct from old.risk_initial_zone
     or new.risk_mitigation is distinct from old.risk_mitigation
     or new.risk_mitigation_voluntary is distinct from old.risk_mitigation_voluntary
     or new.risk_residual_probability_code is distinct from old.risk_residual_probability_code
     or new.risk_residual_severity_code is distinct from old.risk_residual_severity_code
     or new.risk_residual_zone is distinct from old.risk_residual_zone then
    raise exception using errcode = '23001', message = 'Al cerrar un despacho no se puede alterar lo que se verificó al despachar.';
  end if;
  return new;
end;
$$;
create trigger dispatches_close_only before update on dispatches for each row execute function v2_dispatch_close_only();

-- 5) Retención de 5 años (misma función que el resto de registros operacionales; ver 20261005010000).
create trigger dispatches_retention before delete on dispatches for each row execute function v2_enforce_retention('dispatched_at');
create trigger dispatch_checklist_items_retention before delete on dispatch_checklist_items for each row execute function v2_enforce_retention('created_at');

-- 6) RLS: lectura para el PIC y los gestores. SIN políticas de escritura: solo las RPC de abajo escriben.
alter table dispatches enable row level security;
alter table dispatch_checklist_items enable row level security;

create policy dispatches_select on dispatches for select using (
  pilot_person_id = v2_current_person_id() or v2_is_duty_manager(organization_id)
);
create policy dispatch_items_select on dispatch_checklist_items for select using (
  exists (
    select 1 from dispatches d
    where d.id = dispatch_id and (d.pilot_person_id = v2_current_person_id() or v2_is_duty_manager(d.organization_id))
  )
);

-- 7) RPC atómica: despachar. La llama el servidor (service role) DESPUÉS de re-evaluar las
-- verificaciones por su cuenta — nunca confía en lo que mande el navegador.
create or replace function v2_dispatch_create(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission missions%rowtype;
  v_dispatch uuid;
  v_pilot uuid := (p ->> 'pilot_person_id')::uuid;
  v_open duty_periods%rowtype;
  v_had_open boolean;
begin
  select * into v_mission from missions where id = (p ->> 'mission_id')::uuid for update;
  if not found then raise exception 'Misión no encontrada'; end if;
  if v_mission.organization_id <> (p ->> 'organization_id')::uuid then raise exception 'La misión no pertenece a esta organización'; end if;
  if v_mission.pic_person_id <> v_pilot then raise exception 'Solo el PIC asignado puede despachar la misión'; end if;
  if v_mission.status <> 'programada' then raise exception 'La misión está en estado "%" y ya no se puede despachar', v_mission.status; end if;

  -- Un solo período abierto por persona: se reutiliza el de servicio; cualquier otro bloquea.
  select * into v_open from duty_periods where person_id = v_pilot and ended_at is null limit 1;
  v_had_open := found;
  if v_had_open and v_open.type <> 'servicio' then
    raise exception 'Tienes un período de "%" abierto: ciérralo antes de despachar', v_open.type;
  end if;

  insert into dispatches (
    organization_id, mission_id, pilot_person_id, aircraft_id, gates,
    risk_evaluated, risk_probability_code, risk_severity_code, risk_initial_zone, risk_mitigation, risk_mitigation_voluntary,
    risk_residual_probability_code, risk_residual_severity_code, risk_residual_zone
  ) values (
    v_mission.organization_id, v_mission.id, v_pilot, v_mission.aircraft_id, coalesce(p -> 'gates', '[]'::jsonb),
    coalesce((p ->> 'risk_evaluated')::boolean, false),
    nullif(p ->> 'risk_probability_code', '')::integer, nullif(p ->> 'risk_severity_code', ''), nullif(p ->> 'risk_initial_zone', ''),
    nullif(p ->> 'risk_mitigation', ''), coalesce((p ->> 'risk_mitigation_voluntary')::boolean, false),
    nullif(p ->> 'risk_residual_probability_code', '')::integer, nullif(p ->> 'risk_residual_severity_code', ''), nullif(p ->> 'risk_residual_zone', '')
  ) returning id into v_dispatch;

  insert into dispatch_checklist_items (dispatch_id, organization_id, checklist_id, checklist_name, checklist_version, position, step_text, value, note)
  select v_dispatch, v_mission.organization_id, nullif(i ->> 'checklist_id', '')::uuid, i ->> 'checklist_name', nullif(i ->> 'checklist_version', ''),
         (i ->> 'position')::integer, i ->> 'step_text', i ->> 'value', nullif(i ->> 'note', '')
  from jsonb_array_elements(coalesce(p -> 'items', '[]'::jsonb)) i;

  update missions set status = 'despachada' where id = v_mission.id;

  if not v_had_open then
    insert into duty_periods (organization_id, person_id, type, started_at, source)
    values (v_mission.organization_id, v_pilot, 'servicio', now(), 'auto_dispatch');
  end if;

  return v_dispatch;
end;
$$;

-- 8) RPC atómica: cerrar. Crea el vuelo REAL enlazado a la misión, suma las horas a la aeronave
-- (update atómico, nunca read-calculate-write) y cierra despacho y misión.
create or replace function v2_dispatch_close(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dispatch dispatches%rowtype;
  v_flight uuid;
  v_total numeric := (p ->> 'total_time')::numeric;
begin
  select * into v_dispatch from dispatches where id = (p ->> 'dispatch_id')::uuid for update;
  if not found then raise exception 'Despacho no encontrado'; end if;
  if v_dispatch.pilot_person_id <> (p ->> 'pilot_person_id')::uuid then raise exception 'Solo el piloto que despachó puede cerrar el vuelo'; end if;
  if v_dispatch.status <> 'despachado' then raise exception 'Este despacho ya fue cerrado'; end if;

  insert into flights (organization_id, pilot_person_id, aircraft_id, mission_id, takeoff_at, landing_at, total_time, visual_condition, mission_type)
  values (v_dispatch.organization_id, v_dispatch.pilot_person_id, v_dispatch.aircraft_id, v_dispatch.mission_id,
          (p ->> 'takeoff_at')::timestamptz, (p ->> 'landing_at')::timestamptz, v_total,
          nullif(p ->> 'visual_condition', ''), nullif(p ->> 'mission_type', ''))
  returning id into v_flight;

  if v_dispatch.aircraft_id is not null then
    update aircraft set total_hours = total_hours + v_total where id = v_dispatch.aircraft_id;
  end if;

  update dispatches set
    status = 'cerrado', flight_id = v_flight, closed_at = now(),
    close_notes = nullif(p ->> 'notes', ''),
    safety_report = coalesce((p ->> 'safety_report')::boolean, false),
    safety_report_type = nullif(p ->> 'safety_report_type', '')
  where id = v_dispatch.id;

  update missions set status = 'cerrada' where id = v_dispatch.mission_id;
  return v_flight;
end;
$$;

-- Solo el servidor (service role) las ejecuta; ni anon ni usuarios autenticados por RPC.
revoke execute on function v2_dispatch_create(jsonb) from public, anon, authenticated;
revoke execute on function v2_dispatch_close(jsonb) from public, anon, authenticated;
revoke execute on function v2_dispatch_items_immutable() from public, anon, authenticated;
revoke execute on function v2_dispatch_close_only() from public, anon, authenticated;
grant execute on function v2_dispatch_create(jsonb) to service_role;
grant execute on function v2_dispatch_close(jsonb) to service_role;
