-- Skylog V2.0 — cerrar un despacho que el piloto no puede o no cerró (despacho «huérfano»). Decisión 226.
-- Hoy solo cierra quien despachó (`v2_dispatch_close` exige al piloto) y la base impide cerrar sin vuelo
-- (`dispatches_close_consistent`): si el piloto se retira, pierde la membresía o nunca despegó, el despacho queda abierto para
-- siempre, la misión «despachada» y nadie puede corregirlo. Esta migración permite a un gestor cerrarlo de dos formas, siempre con
-- motivo y autor: (a) «con vuelo»: registra el vuelo real a nombre del piloto con las horas que se indiquen; (b) «sin vuelo»: el vuelo
-- no se realizó (la misión pasa a cancelada). La constancia del despacho no se altera (el trigger sigue protegiendo gates y riesgo).
-- Aditiva y reversible: columnas nulas, restricción más amplia, función nueva solo para el servidor.

alter table public.dispatches
  add column if not exists closed_by uuid references public.people(id),
  add column if not exists close_mode text check (close_mode in ('piloto', 'gestor', 'sin_vuelo'));

-- Cerrado ⇔ tiene hora de cierre; y un cerrado tiene vuelo o es «sin vuelo» (nunca ambos ni ninguno). Las filas existentes cumplen.
alter table public.dispatches drop constraint if exists dispatches_close_consistent;
alter table public.dispatches add constraint dispatches_close_consistent check (
  (status = 'cerrado') = (closed_at is not null)
  and (status <> 'cerrado' or ((flight_id is not null) <> (coalesce(close_mode, '') = 'sin_vuelo')))
);

create or replace function public.v2_dispatch_close_by_manager(p jsonb)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_dispatch dispatches%rowtype;
  v_flight uuid := null;
  v_mode text := p ->> 'mode';
  v_reason text := nullif(btrim(coalesce(p ->> 'reason', '')), '');
  v_closer uuid := (p ->> 'closer_person_id')::uuid;
  v_total numeric := (p ->> 'total_time')::numeric;
  v_zone text;
begin
  if v_mode not in ('con_vuelo', 'sin_vuelo') then raise exception 'Indica si el vuelo se realizó o no'; end if;
  if v_reason is null or length(v_reason) < 5 then raise exception 'Escribe el motivo del cierre (mínimo 5 caracteres)'; end if;

  select * into v_dispatch from dispatches where id = (p ->> 'dispatch_id')::uuid for update;
  if not found then raise exception 'Despacho no encontrado'; end if;
  if v_dispatch.organization_id <> (p ->> 'organization_id')::uuid then raise exception 'El despacho no pertenece a esta organización'; end if;
  if v_dispatch.status <> 'despachado' then raise exception 'Este despacho ya fue cerrado'; end if;

  if v_mode = 'sin_vuelo' then
    update dispatches set
      status = 'cerrado', closed_at = now(), close_mode = 'sin_vuelo', closed_by = v_closer,
      close_notes = 'Cerrado sin vuelo por un gestor: ' || v_reason
    where id = v_dispatch.id;
    update missions set status = 'cancelada' where id = v_dispatch.mission_id;
    return null;
  end if;

  if v_total is null or v_total <= 0 or v_total > 24 then raise exception 'La duración del vuelo no es válida'; end if;
  select zone into v_zone from missions where id = v_dispatch.mission_id;

  insert into flights (organization_id, pilot_person_id, aircraft_id, mission_id, takeoff_at, landing_at, total_time, visual_condition, mission_type, location, notes, source)
  values (v_dispatch.organization_id, v_dispatch.pilot_person_id, v_dispatch.aircraft_id, v_dispatch.mission_id,
          (p ->> 'takeoff_at')::timestamptz, (p ->> 'landing_at')::timestamptz, v_total,
          nullif(p ->> 'visual_condition', ''), nullif(p ->> 'mission_type', ''),
          nullif(v_zone, ''), nullif(p ->> 'notes', ''), 'despacho')
  returning id into v_flight;

  if v_dispatch.aircraft_id is not null then
    update aircraft set total_hours = total_hours + v_total where id = v_dispatch.aircraft_id;
  end if;

  update dispatches set
    status = 'cerrado', flight_id = v_flight, closed_at = now(), close_mode = 'gestor', closed_by = v_closer,
    close_notes = 'Cerrado por un gestor (el piloto no lo cerró): ' || v_reason
  where id = v_dispatch.id;
  update missions set status = 'cerrada' where id = v_dispatch.mission_id;
  return v_flight;
end;
$function$;

revoke execute on function public.v2_dispatch_close_by_manager(jsonb) from public, anon, authenticated;
grant execute on function public.v2_dispatch_close_by_manager(jsonb) to service_role;
