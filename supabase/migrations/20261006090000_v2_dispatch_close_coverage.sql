-- Skylog V2.0 — el cierre de vuelo ahora también guarda lugar (la zona de la misión), notas (las novedades del
-- piloto) y el origen `despacho` en el vuelo — columnas agregadas en 20261006080000 para la migración.
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
begin
  select * into v_dispatch from dispatches where id = (p ->> 'dispatch_id')::uuid for update;
  if not found then raise exception 'Despacho no encontrado'; end if;
  if v_dispatch.pilot_person_id <> (p ->> 'pilot_person_id')::uuid then raise exception 'Solo el piloto que despachó puede cerrar el vuelo'; end if;
  if v_dispatch.status <> 'despachado' then raise exception 'Este despacho ya fue cerrado'; end if;

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
    status = 'cerrado', flight_id = v_flight, closed_at = now(),
    close_notes = nullif(p ->> 'notes', ''),
    safety_report = coalesce((p ->> 'safety_report')::boolean, false),
    safety_report_type = nullif(p ->> 'safety_report_type', '')
  where id = v_dispatch.id;

  update missions set status = 'cerrada' where id = v_dispatch.mission_id;
  return v_flight;
end;
$function$;
