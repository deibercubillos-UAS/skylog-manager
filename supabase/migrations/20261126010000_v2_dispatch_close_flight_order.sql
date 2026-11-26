-- Skylog V2.0 — La orden de vuelo (código del cliente) se hereda de la misión al vuelo al cerrar
-- un despacho. Decisión del usuario 2026-11-25 ("código por misión, heredado al vuelo"); la columna
-- se creó en 20261125010000_v2_flight_order.sql (missions.flight_order y flights.flight_order).
--
-- Igual que ya se hace con `zone`/`zone_geo` (ver 20261122010000): las dos funciones de cierre leen
-- `missions.flight_order` y lo copian a `flights.flight_order`. Aditiva: solo `create or replace`
-- con una columna más en el select y en el insert de cada función. Nada más cambia. El vuelo manual
-- (POST /api/flights) ya recibe su orden por el body; aquí se cubre el camino de Despacho.

create or replace function public.v2_dispatch_close(p jsonb)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_dispatch dispatches%rowtype;
  v_flight uuid;
  v_total numeric := (p ->> 'total_time')::numeric;
  v_zone text;
  v_zone_geo jsonb;
  v_flight_order text;
begin
  select * into v_dispatch from dispatches where id = (p ->> 'dispatch_id')::uuid for update;
  if not found then raise exception 'Despacho no encontrado'; end if;
  if v_dispatch.pilot_person_id <> (p ->> 'pilot_person_id')::uuid then raise exception 'Solo el piloto que despachó puede cerrar el vuelo'; end if;
  if v_dispatch.status <> 'despachado' then raise exception 'Este despacho ya fue cerrado'; end if;

  select zone, zone_geo, flight_order into v_zone, v_zone_geo, v_flight_order from missions where id = v_dispatch.mission_id;

  insert into flights (organization_id, pilot_person_id, aircraft_id, mission_id, takeoff_at, landing_at, total_time, visual_condition, mission_type, location, notes, source, zone_geo, flight_order)
  values (v_dispatch.organization_id, v_dispatch.pilot_person_id, v_dispatch.aircraft_id, v_dispatch.mission_id,
          (p ->> 'takeoff_at')::timestamptz, (p ->> 'landing_at')::timestamptz, v_total,
          nullif(p ->> 'visual_condition', ''), nullif(p ->> 'mission_type', ''),
          nullif(v_zone, ''), nullif(p ->> 'notes', ''), 'despacho', v_zone_geo, v_flight_order)
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
$function$;

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
  v_zone_geo jsonb;
  v_flight_order text;
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
  select zone, zone_geo, flight_order into v_zone, v_zone_geo, v_flight_order from missions where id = v_dispatch.mission_id;

  insert into flights (organization_id, pilot_person_id, aircraft_id, mission_id, takeoff_at, landing_at, total_time, visual_condition, mission_type, location, notes, source, zone_geo, flight_order)
  values (v_dispatch.organization_id, v_dispatch.pilot_person_id, v_dispatch.aircraft_id, v_dispatch.mission_id,
          (p ->> 'takeoff_at')::timestamptz, (p ->> 'landing_at')::timestamptz, v_total,
          nullif(p ->> 'visual_condition', ''), nullif(p ->> 'mission_type', ''),
          nullif(v_zone, ''), nullif(p ->> 'notes', ''), 'despacho', v_zone_geo, v_flight_order)
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
