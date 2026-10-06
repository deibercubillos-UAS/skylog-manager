-- Skylog V2.0 — los códigos de probabilidad de la matriz de riesgo son TEXTO configurable por
-- la organización (p. ej. "1", "A", "P-3"), no enteros: `risk_matrices.probability_levels[].code`.
-- Solo branch `develop-v2` (regla O1). `dispatches` aún no tiene filas.
alter table dispatches alter column risk_probability_code type text using risk_probability_code::text;
alter table dispatches alter column risk_residual_probability_code type text using risk_residual_probability_code::text;

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
    nullif(p ->> 'risk_probability_code', ''), nullif(p ->> 'risk_severity_code', ''), nullif(p ->> 'risk_initial_zone', ''),
    nullif(p ->> 'risk_mitigation', ''), coalesce((p ->> 'risk_mitigation_voluntary')::boolean, false),
    nullif(p ->> 'risk_residual_probability_code', ''), nullif(p ->> 'risk_residual_severity_code', ''), nullif(p ->> 'risk_residual_zone', '')
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

revoke execute on function v2_dispatch_create(jsonb) from public, anon, authenticated;
grant execute on function v2_dispatch_create(jsonb) to service_role;
