-- Skylog V2.0 — Retención de 5 años y custodia legal por suceso
-- (RAC 100 §100.535(29); ítem 34 de MAUT-5.0-12-095). docs/skylog-v2/31-esquema-datos.md §6.
-- Solo para el Supabase branch `develop-v2` (regla O1): NUNCA se aplica a producción.
--
-- 1) RETENCIÓN: un registro operacional no se puede BORRAR antes de 5 años de su
--    fecha propia (vuelo → takeoff_at, mantenimiento → performed_at, …). Lo impone
--    un trigger, no la interfaz: también frena a quien borre vía PostgREST y a los
--    ON DELETE CASCADE (borrar una aeronave ya no se lleva su libro de mantenimiento).
-- 2) CUSTODIA: un vuelo bajo custodia no se borra NUNCA mientras la custodia esté
--    activa (aunque pasen los 5 años), y su replay no se puede borrar ni sobrescribir
--    — que es exactamente lo que haría una purga por cuota de plan.
-- Las custodias y su bitácora de accesos son append-only.
--
-- ⚠️ La lista de tablas de abajo debe coincidir con RETAINED_RECORD_TYPES en
-- packages/domain/src/retentionPolicy.js (esa es la que ve el usuario).

-- Autoridad para LEVANTAR una custodia: más estricta que "gestor" (excluye jefe_pilotos).
-- Misma lista que HOLD_RELEASE_ROLES en retentionPolicy.js.
create or replace function v2_is_org_authority(p_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from memberships m
    join accounts a on a.person_id = m.person_id
    where a.auth_user_id = auth.uid()
      and m.organization_id = p_organization_id
      and m.status = 'activa'
      and m.role in ('admin', 'gerente_sms', 'superadmin')
  );
$$;
comment on function v2_is_org_authority is 'RLS helper — true si la sesión actual es admin/gerente_sms/superadmin activo en esa organización (puede liberar una custodia legal).';

create table if not exists legal_holds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  reason text not null check (length(btrim(reason)) > 0),
  sms_case_id uuid references sms_cases(id),
  opened_by uuid not null references people(id),
  opened_at timestamptz not null default now(),
  released_at timestamptz,
  released_by uuid references people(id),
  release_reason text,
  constraint legal_holds_release_consistent check (
    (released_at is null) = (released_by is null)
    and (released_at is null) = (release_reason is null)
  )
);
comment on table legal_holds is '31-esquema-datos.md §6 — custodia legal por suceso (ítem 34 de MAUT-5.0-12-095). Nunca se borra; se LIBERA, y solo una autoridad. Mientras esté activa, los vuelos enlazados no se pueden borrar ni perder su replay.';

create table if not exists legal_hold_flights (
  hold_id uuid not null references legal_holds(id) on delete cascade,
  flight_id uuid not null references flights(id) on delete restrict,
  primary key (hold_id, flight_id)
);
comment on table legal_hold_flights is 'Vuelos bajo una custodia. Un vuelo no sale de una custodia: se libera la custodia completa.';

create table if not exists legal_hold_events (
  id uuid primary key default gen_random_uuid(),
  hold_id uuid not null references legal_holds(id) on delete cascade,
  event_type text not null check (event_type in ('opened', 'released', 'accessed')),
  actor_person_id uuid references people(id),
  flight_id uuid references flights(id) on delete restrict,
  detail text,
  created_at timestamptz not null default now()
);
comment on table legal_hold_events is 'Bitácora append-only de una custodia: apertura, liberación y CADA acceso al material bajo custodia. Solo la escribe el servidor (service role); ningún usuario puede insertar ni modificar.';

create index if not exists legal_holds_org_idx on legal_holds (organization_id, opened_at desc);
create index if not exists legal_hold_flights_flight_idx on legal_hold_flights (flight_id);
create index if not exists legal_hold_events_hold_idx on legal_hold_events (hold_id, created_at);

-- ¿Este vuelo está bajo una custodia activa?
create or replace function v2_flight_under_hold(p_flight_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from legal_hold_flights hf
    join legal_holds h on h.id = hf.hold_id
    where hf.flight_id = p_flight_id and h.released_at is null
  );
$$;
comment on function v2_flight_under_hold is 'true si el vuelo está en una custodia legal activa. Toda purga futura (por cuota de plan o manual) debe consultarlo.';

-- Las custodias nunca se borran; su bitácora tampoco se modifica.
create or replace function v2_legal_hold_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception using
    errcode = '23001',
    message = 'Las custodias legales y su bitácora no se pueden eliminar ni modificar (se libera la custodia, no se borra).';
end;
$$;

create trigger legal_holds_no_delete before delete on legal_holds for each row execute function v2_legal_hold_immutable();
create trigger legal_hold_flights_no_delete before delete on legal_hold_flights for each row execute function v2_legal_hold_immutable();
create trigger legal_hold_flights_no_update before update on legal_hold_flights for each row execute function v2_legal_hold_immutable();
create trigger legal_hold_events_no_delete before delete on legal_hold_events for each row execute function v2_legal_hold_immutable();
create trigger legal_hold_events_no_update before update on legal_hold_events for each row execute function v2_legal_hold_immutable();

-- Una custodia solo admite UNA transición: activa → liberada. Nada más cambia.
create or replace function v2_legal_hold_release_only()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.released_at is not null then
    raise exception using errcode = '23001', message = 'Esta custodia ya fue liberada y no admite cambios.';
  end if;
  if new.released_at is null then
    raise exception using errcode = '23001', message = 'Una custodia solo puede modificarse para liberarla.';
  end if;
  if new.organization_id is distinct from old.organization_id
     or new.reason is distinct from old.reason
     or new.sms_case_id is distinct from old.sms_case_id
     or new.opened_by is distinct from old.opened_by
     or new.opened_at is distinct from old.opened_at then
    raise exception using errcode = '23001', message = 'Al liberar una custodia no se puede alterar su motivo ni su apertura.';
  end if;
  return new;
end;
$$;
create trigger legal_holds_release_only before update on legal_holds for each row execute function v2_legal_hold_release_only();

-- Retención: bloquea el DELETE de un registro operacional dentro de sus 5 años,
-- o de un vuelo (y sus eventos inesperados) bajo custodia sin importar su edad.
-- TG_ARGV[0] = columna con la fecha propia del registro (cae a created_at).
create or replace function v2_enforce_retention()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flight uuid;
  v_record_date date;
  v_expiry date;
  v_raw timestamptz;
begin
  if TG_TABLE_NAME = 'flights' then
    v_flight := OLD.id;
  elsif TG_TABLE_NAME = 'unexpected_events' then
    v_flight := OLD.flight_id;
  end if;

  if v_flight is not null and v2_flight_under_hold(v_flight) then
    raise exception using
      errcode = '23001',
      message = 'Registro bajo custodia legal activa: no se puede eliminar hasta que una autoridad la libere.';
  end if;

  v_raw := coalesce((to_jsonb(OLD) ->> TG_ARGV[0])::timestamptz, (to_jsonb(OLD) ->> 'created_at')::timestamptz);
  if v_raw is null then
    raise exception using errcode = '23001', message = format('Registro de %s sin fecha: no se puede verificar su retención, por eso no se elimina.', TG_TABLE_NAME);
  end if;

  v_record_date := (v_raw at time zone 'America/Bogota')::date;
  v_expiry := (v_record_date + interval '5 years')::date;
  if (now() at time zone 'America/Bogota')::date <= v_expiry then
    raise exception using
      errcode = '23001',
      message = format('Registro operacional bajo retención legal hasta %s (RAC 100 §100.535(29)): no se puede eliminar.', v_expiry);
  end if;

  return OLD;
end;
$$;

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('flights', 'takeoff_at'),
      ('maintenance_events', 'performed_at'),
      ('unexpected_events', 'reported_at'),
      ('duty_periods', 'started_at'),
      ('duty_exceptions', 'created_at'),
      ('duty_annual_certifications', 'certified_at'),
      ('missions', 'scheduled_at'),
      ('authorization_requests', 'created_at'),
      ('risk_analyses', 'created_at'),
      ('sms_reports', 'created_at'),
      ('sms_cases', 'created_at'),
      ('sms_case_actions', 'created_at'),
      ('sms_case_events', 'created_at'),
      ('sms_monthly_reports', 'created_at')
    ) as t(tbl, col)
  loop
    execute format('drop trigger if exists %I on %I', r.tbl || '_retention', r.tbl);
    execute format('create trigger %I before delete on %I for each row execute function v2_enforce_retention(%L)', r.tbl || '_retention', r.tbl, r.col);
  end loop;
end $$;

-- Replay bajo custodia: no se puede vaciar ni sobrescribir (una purga por cuota es
-- justamente un UPDATE que lo pone en null). Poner un replay donde no había sí se permite.
create or replace function v2_flight_replay_hold_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if v2_flight_under_hold(old.id)
     and ((old.replay_track is not null and new.replay_track is distinct from old.replay_track)
       or (old.replay_path is not null and new.replay_path is distinct from old.replay_path)) then
    raise exception using
      errcode = '23001',
      message = 'El replay de un vuelo bajo custodia legal no se puede borrar ni sobrescribir.';
  end if;
  return new;
end;
$$;
create trigger flights_replay_hold_guard before update of replay_track, replay_path on flights for each row execute function v2_flight_replay_hold_guard();

-- Los triggers no necesitan EXECUTE del usuario; nadie debe poder invocarlos por RPC.
revoke execute on function v2_enforce_retention() from public, anon, authenticated;
revoke execute on function v2_flight_replay_hold_guard() from public, anon, authenticated;
revoke execute on function v2_legal_hold_immutable() from public, anon, authenticated;
revoke execute on function v2_legal_hold_release_only() from public, anon, authenticated;
revoke execute on function v2_flight_under_hold(uuid) from public, anon;

alter table legal_holds enable row level security;
alter table legal_hold_flights enable row level security;
alter table legal_hold_events enable row level security;

-- Abrir: cualquier gestor, a su nombre y ya activa. Liberar (UPDATE): solo autoridad.
create policy legal_holds_select on legal_holds for select using (v2_is_duty_manager(organization_id));
create policy legal_holds_insert on legal_holds for insert
  with check (v2_is_duty_manager(organization_id) and opened_by = v2_current_person_id() and released_at is null);
create policy legal_holds_release on legal_holds for update
  using (v2_is_org_authority(organization_id))
  with check (v2_is_org_authority(organization_id));

create policy legal_hold_flights_select on legal_hold_flights for select using (
  exists (select 1 from legal_holds h where h.id = hold_id and v2_is_duty_manager(h.organization_id))
);
-- Solo a una custodia ACTIVA y solo vuelos de la misma organización.
create policy legal_hold_flights_insert on legal_hold_flights for insert with check (
  exists (
    select 1 from legal_holds h
    join flights f on f.id = flight_id
    where h.id = hold_id
      and h.released_at is null
      and f.organization_id = h.organization_id
      and v2_is_duty_manager(h.organization_id)
  )
);

-- Eventos: lectura para gestores; SIN política de insert/update/delete — solo el servidor
-- (service role) los escribe, así nadie puede falsear la bitácora de accesos.
create policy legal_hold_events_select on legal_hold_events for select using (
  exists (select 1 from legal_holds h where h.id = hold_id and v2_is_duty_manager(h.organization_id))
);
