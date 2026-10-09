-- Skylog V2.0 — MIGRACIÓN BASE (esquema `public` completo).
-- Generada a partir del esquema real de la rama `develop-v2` (proyecto bqimtkwzayewwubgsaji) el 2026-10-09.
-- Aplicar sobre un proyecto Supabase NUEVO y vacío (decisión A), ANTES de las migraciones posteriores
-- que se agreguen a `supabase/migrations/` y de los datos semilla (`supabase/baseline/seed_*.sql`).
-- No usar sobre la rama ni sobre producción: ya tienen este esquema.
-- Orden: extensiones → funciones → tablas → restricciones → índices → disparadores → RLS → políticas → permisos → publicación.
set check_function_bodies = off;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- ============ Funciones ============
CREATE OR REPLACE FUNCTION public.increment_aircraft_hours(p_id uuid, p_hours numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (
    select 1 from aircraft
    where id = p_id
      and organization_id in (select v2_current_organization_ids())
  ) then
    raise exception 'Sin membresía activa en la organización de esta aeronave';
  end if;

  update aircraft set total_hours = total_hours + p_hours where id = p_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.increment_battery_cycles(p_id uuid, p_cycles numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (
    select 1 from batteries
    where id = p_id
      and organization_id in (select v2_current_organization_ids())
  ) then
    raise exception 'Sin membresía activa en la organización de esta batería';
  end if;

  update batteries set cycles = cycles + p_cycles where id = p_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.set_battery_cycles_if_greater(p_id uuid, p_cycles numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (
    select 1 from batteries
    where id = p_id
      and organization_id in (select v2_current_organization_ids())
  ) then
    raise exception 'Sin membresía activa en la organización de esta batería';
  end if;

  update batteries set cycles = p_cycles where id = p_id and p_cycles > cycles;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.v2_accept_invitation(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_inv invitations%rowtype;
  v_auth uuid := (p ->> 'auth_user_id')::uuid;
  v_res jsonb;
begin
  select * into v_inv from invitations where token = p ->> 'token' for update;
  if not found then raise exception 'Invitación no encontrada'; end if;
  if v_inv.status <> 'pendiente' then raise exception 'Esta invitación ya fue usada o cancelada'; end if;
  if v_inv.expires_at < now() then
    update invitations set status = 'expirada' where id = v_inv.id;
    raise exception 'La invitación venció';
  end if;

  if v_inv.person_id is not null
     and not exists (select 1 from accounts where auth_user_id = v_auth)
     and not exists (select 1 from accounts where person_id = v_inv.person_id) then
    insert into accounts (person_id, auth_user_id, signup_attribution) values (v_inv.person_id, v_auth, p -> 'attribution');
    update people set full_name = coalesce(nullif(p ->> 'full_name', ''), full_name), phone = coalesce(nullif(p ->> 'phone', ''), phone) where id = v_inv.person_id;
  end if;

  v_res := public.v2_join_organization(jsonb_build_object(
    'auth_user_id', v_auth, 'organization_id', v_inv.organization_id, 'role', v_inv.role, 'allow_admin', true,
    'email', v_inv.email, 'full_name', p ->> 'full_name', 'phone', p ->> 'phone', 'attribution', p -> 'attribution'));

  update invitations set status = 'aceptada', accepted_at = now() where id = v_inv.id;
  return v_res;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.v2_accept_partner_invitation(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_inv partner_invitations%rowtype;
  v_auth uuid := (p ->> 'auth_user_id')::uuid;
  v_email text := lower(trim(p ->> 'email'));
  v_person uuid;
begin
  select * into v_inv from partner_invitations where token = p ->> 'token' for update;
  if not found then raise exception 'La invitación no existe'; end if;
  if v_inv.status <> 'pendiente' then raise exception 'La invitación ya no está vigente'; end if;
  if v_inv.expires_at <= now() then raise exception 'La invitación venció'; end if;
  if lower(v_inv.email) <> v_email then raise exception 'El correo no coincide con la invitación'; end if;
  if not exists (select 1 from partners where id = v_inv.partner_id and status = 'activo') then raise exception 'El socio no está activo'; end if;

  select person_id into v_person from accounts where auth_user_id = v_auth;
  if v_person is null then
    select pe.id into v_person from people pe
      where lower(pe.email) = v_email and not exists (select 1 from accounts a where a.person_id = pe.id)
      order by pe.created_at limit 1;
    if v_person is null then
      insert into people (full_name, email, phone) values (p ->> 'full_name', v_email, nullif(p ->> 'phone', '')) returning id into v_person;
    else
      update people set full_name = coalesce(nullif(p ->> 'full_name', ''), full_name), phone = coalesce(nullif(p ->> 'phone', ''), phone) where id = v_person;
    end if;
    insert into accounts (person_id, auth_user_id) values (v_person, v_auth);
  end if;

  insert into partner_members (partner_id, person_id, role) values (v_inv.partner_id, v_person, v_inv.role)
    on conflict (partner_id, person_id) do update set role = excluded.role;
  update partner_invitations set status = 'aceptada' where id = v_inv.id;
  return jsonb_build_object('person_id', v_person, 'partner_id', v_inv.partner_id, 'role', v_inv.role);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.v2_admin_delete_account(p_person uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_auth uuid;
  v_org uuid;
  v_orgs_deleted int := 0;
  v_person_deleted boolean := false;
begin
  if not exists (select 1 from people where id = p_person) then raise exception 'La persona no existe'; end if;
  if exists (select 1 from memberships where person_id = p_person and role = 'superadmin' and status = 'activa') then
    raise exception 'No se puede eliminar a un superadmin';
  end if;

  select auth_user_id into v_auth from accounts where person_id = p_person;

  for v_org in
    select m.organization_id from memberships m
    where m.person_id = p_person and m.status = 'activa'
      and not exists (select 1 from memberships o where o.organization_id = m.organization_id and o.status = 'activa' and o.person_id <> p_person)
  loop
    delete from organizations where id = v_org;
    v_orgs_deleted := v_orgs_deleted + 1;
  end loop;

  update memberships set status = 'cerrada', ended_at = now() where person_id = p_person and status = 'activa';
  delete from partner_members where person_id = p_person;
  delete from accounts where person_id = p_person;

  begin
    delete from people where id = p_person;
    v_person_deleted := true;
  exception when foreign_key_violation then
    update people set email = null, phone = null, document_type = null, document_number = null, license_number = null,
      medical_cert_expiry = null, medical_cert_doc_id = null, avatar_path = null, emergency_contact_name = null, emergency_contact_phone = null
    where id = p_person;
  end;

  return jsonb_build_object('auth_user_id', v_auth, 'organizations_deleted', v_orgs_deleted, 'person_deleted', v_person_deleted);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.v2_create_free_grant(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_partner partners%rowtype;
  v_email text := lower(trim(p ->> 'email'));
  v_grant uuid;
begin
  select * into v_partner from partners where id = (p ->> 'partner_id')::uuid for update;
  if not found or v_partner.status <> 'activo' then raise exception 'El socio no está activo'; end if;
  if v_partner.free_seats_limit is not null and v_partner.free_seats_used >= v_partner.free_seats_limit then
    raise exception 'Se agotaron los cupos de perfiles gratis';
  end if;
  if exists (select 1 from free_grants where lower(email) = v_email) then
    raise exception 'Este correo ya recibió un perfil gratis';
  end if;
  insert into free_grants (partner_id, advisor_member_id, email, plan, status, token, granted_at, expires_at, purge_after)
  values (v_partner.id, nullif(p ->> 'advisor_member_id', '')::uuid, v_email, 'piloto', 'enviado', p ->> 'token',
          (p ->> 'granted_at')::timestamptz, (p ->> 'expires_at')::timestamptz, (p ->> 'purge_after')::timestamptz)
  returning id into v_grant;
  update partners set free_seats_used = free_seats_used + 1 where id = v_partner.id;
  return jsonb_build_object('grant_id', v_grant, 'partner_name', v_partner.name, 'free_days', v_partner.free_days, 'logo_url', v_partner.logo_url);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.v2_current_organization_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select m.organization_id
  from memberships m
  join accounts a on a.person_id = m.person_id
  where a.auth_user_id = auth.uid()
    and m.status = 'activa';
$function$
;
CREATE OR REPLACE FUNCTION public.v2_current_person_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select a.person_id from accounts a where a.auth_user_id = auth.uid();
$function$
;
CREATE OR REPLACE FUNCTION public.v2_delete_free_grant(p_grant uuid, p_partner uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_grant free_grants%rowtype;
begin
  select * into v_grant from free_grants where id = p_grant and partner_id = p_partner for update;
  if not found then raise exception 'Regalo no encontrado'; end if;
  delete from free_grants where id = v_grant.id;
  update partners set free_seats_used = greatest(0, free_seats_used - 1) where id = p_partner;
  return jsonb_build_object('redeemed_organization_id', v_grant.redeemed_organization_id);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.v2_dispatch_close(p jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.v2_dispatch_close_only()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.v2_dispatch_create(p jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.v2_dispatch_items_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  raise exception using errcode = '23001', message = 'Los pasos de un despacho son evidencia y no se pueden modificar.';
end;
$function$
;
CREATE OR REPLACE FUNCTION public.v2_enforce_retention()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.v2_flight_replay_hold_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.v2_flight_under_hold(p_flight_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from legal_hold_flights hf
    join legal_holds h on h.id = hf.hold_id
    where hf.flight_id = p_flight_id and h.released_at is null
  );
$function$
;
CREATE OR REPLACE FUNCTION public.v2_is_duty_manager(p_organization_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from memberships m
    join accounts a on a.person_id = m.person_id
    where a.auth_user_id = auth.uid()
      and m.organization_id = p_organization_id
      and m.status = 'activa'
      and m.role in ('admin', 'jefe_pilotos', 'gerente_sms', 'superadmin')
  );
$function$
;
CREATE OR REPLACE FUNCTION public.v2_is_org_authority(p_organization_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from memberships m
    join accounts a on a.person_id = m.person_id
    where a.auth_user_id = auth.uid()
      and m.organization_id = p_organization_id
      and m.status = 'activa'
      and m.role in ('admin', 'gerente_sms', 'superadmin')
  );
$function$
;
CREATE OR REPLACE FUNCTION public.v2_is_sms_analyst(p_organization_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from memberships m
    join accounts a on a.person_id = m.person_id
    where a.auth_user_id = auth.uid()
      and m.organization_id = p_organization_id
      and m.status = 'activa'
      and m.role in ('gerente_sms', 'superadmin')
  );
$function$
;
CREATE OR REPLACE FUNCTION public.v2_join_organization(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_auth uuid := (p ->> 'auth_user_id')::uuid;
  v_org uuid := (p ->> 'organization_id')::uuid;
  v_role text := p ->> 'role';
  v_email text := lower(coalesce(p ->> 'email', ''));
  v_allow_admin boolean := coalesce((p ->> 'allow_admin')::boolean, false);
  v_person uuid;
  v_member uuid;
begin
  if v_auth is null or v_org is null then raise exception 'Faltan datos para unirse'; end if;
  if v_role not in ('piloto', 'jefe_pilotos', 'gerente_sms') and not (v_allow_admin and v_role = 'admin') then
    raise exception 'Rol no permitido para unirse a una organización';
  end if;

  perform 1 from organizations where id = v_org for update;
  if not found then raise exception 'La organización no existe'; end if;

  select person_id into v_person from accounts where auth_user_id = v_auth;
  if v_person is null then
    select pe.id into v_person from people pe
      where v_email <> '' and lower(pe.email) = v_email
        and not exists (select 1 from accounts a where a.person_id = pe.id)
      order by pe.created_at limit 1;
    if v_person is null then
      insert into people (full_name, email, phone)
      values (p ->> 'full_name', nullif(v_email, ''), nullif(p ->> 'phone', ''))
      returning id into v_person;
    else
      update people set full_name = coalesce(nullif(p ->> 'full_name', ''), full_name), phone = coalesce(nullif(p ->> 'phone', ''), phone) where id = v_person;
    end if;
    insert into accounts (person_id, auth_user_id, signup_attribution) values (v_person, v_auth, p -> 'attribution');
  end if;

  if exists (select 1 from memberships where person_id = v_person and organization_id = v_org and status = 'activa') then
    raise exception 'Ya eres miembro de esta organización';
  end if;
  if v_role in ('jefe_pilotos', 'gerente_sms') and exists (select 1 from memberships where organization_id = v_org and role = v_role and status = 'activa') then
    raise exception 'El cargo ya está ocupado en esta organización';
  end if;

  insert into memberships (person_id, organization_id, role, status) values (v_person, v_org, v_role, 'activa') returning id into v_member;
  return jsonb_build_object('person_id', v_person, 'organization_id', v_org, 'membership_id', v_member);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.v2_legal_hold_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  raise exception using
    errcode = '23001',
    message = 'Las custodias legales y su bitácora no se pueden eliminar ni modificar (se libera la custodia, no se borra).';
end;
$function$
;
CREATE OR REPLACE FUNCTION public.v2_legal_hold_release_only()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.v2_missions_lifecycle_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if old.status in ('despachada', 'cerrada') then
    raise exception using
      errcode = '23001',
      message = format('La misión está %s: ya tiene constancia de despacho y no se puede modificar ni cancelar.', old.status);
  end if;

  if new.status in ('despachada', 'cerrada') then
    raise exception using
      errcode = '23001',
      message = 'Una misión solo pasa a despachada o cerrada mediante el Despacho y el Cierre de vuelo.';
  end if;

  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.v2_my_partner_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select partner_id from partner_members where person_id = public.v2_current_person_id()
$function$
;
CREATE OR REPLACE FUNCTION public.v2_org_by_nit(p_nit text)
 RETURNS TABLE(id uuid, company_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select o.id, o.company_name from organizations o
  where upper(regexp_replace(coalesce(o.nit, ''), '[\s\-.]', '', 'g')) = upper(regexp_replace(coalesce(p_nit, ''), '[\s\-.]', '', 'g'))
    and coalesce(o.nit, '') <> ''
  limit 1;
$function$
;
CREATE OR REPLACE FUNCTION public.v2_register_explotador(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_person uuid;
  v_org uuid;
  v_email text := lower(coalesce(p ->> 'email', ''));
  v_nit text := upper(regexp_replace(coalesce(p ->> 'nit', ''), '[\s\-.]', '', 'g'));
  v_trial int := coalesce((p ->> 'trial_days')::int, 15);
begin
  if (p ->> 'auth_user_id') is null then raise exception 'Falta el usuario de autenticación'; end if;
  if v_nit = '' then raise exception 'El NIT es obligatorio'; end if;
  if exists (select 1 from organizations where upper(regexp_replace(nit, '[\s\-.]', '', 'g')) = v_nit) then
    raise exception 'Ya existe una organización registrada con ese NIT';
  end if;

  select pe.id into v_person from people pe
    where v_email <> '' and lower(pe.email) = v_email
      and not exists (select 1 from accounts a where a.person_id = pe.id)
    order by pe.created_at limit 1;
  if v_person is null then
    insert into people (full_name, email, phone)
    values (p ->> 'full_name', nullif(v_email, ''), nullif(p ->> 'phone', ''))
    returning id into v_person;
  else
    update people set full_name = coalesce(nullif(p ->> 'full_name', ''), full_name), phone = coalesce(nullif(p ->> 'phone', ''), phone) where id = v_person;
  end if;

  insert into accounts (person_id, auth_user_id, signup_attribution)
  values (v_person, (p ->> 'auth_user_id')::uuid, p -> 'attribution');

  insert into organizations (company_name, nit, nit_type, contact_email, phone)
  values (p ->> 'company_name', v_nit, nullif(p ->> 'nit_type', ''), nullif(v_email, ''), nullif(p ->> 'phone', ''))
  returning id into v_org;

  insert into memberships (person_id, organization_id, role, status)
  values (v_person, v_org, 'admin', 'activa');

  insert into subscriptions (organization_id, plan, billing, expires_at, notes)
  values (v_org, 'piloto', 'monthly', now() + make_interval(days => v_trial), 'Prueba gratuita de registro');

  return jsonb_build_object('person_id', v_person, 'organization_id', v_org);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.v2_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end $function$
;

-- ============ Tablas ============
create table public.accounts (
  id uuid default gen_random_uuid() not null,
  person_id uuid not null,
  auth_user_id uuid,
  created_at timestamp with time zone default now() not null,
  signup_attribution jsonb
);

create table public.aircraft (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  model_id uuid not null,
  serial_number text not null,
  ruas_number text,
  ownership_doc_id uuid,
  total_hours numeric default 0 not null,
  operational_status text default 'disponible'::text not null,
  firmware_version text,
  firmware_previous_version text,
  firmware_backup_path text,
  firmware_updated_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  ownership_type text,
  ownership_reference text,
  ownership_document_path text,
  actual_weight_kg numeric,
  image_path text
);

create table public.aircraft_components (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  aircraft_id uuid not null,
  component_type text not null,
  serial_number text,
  installed_at timestamp with time zone default now() not null,
  installed_at_aircraft_hours numeric default 0 not null,
  status text default 'activo'::text not null,
  retired_at timestamp with time zone,
  retired_at_aircraft_hours numeric,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  name text
);

create table public.aircraft_models (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  brand text not null,
  model text not null,
  category text,
  mtow_kg numeric,
  pmbo_kg numeric,
  max_ascent_speed_ms numeric,
  max_descent_speed_ms numeric,
  max_flight_speed_ms numeric,
  max_wind_ms numeric,
  ceiling_m numeric,
  endurance_min numeric,
  range_m numeric,
  temp_min_c numeric,
  temp_max_c numeric,
  gnss_supported jsonb default '[]'::jsonb not null,
  ip_rating text,
  c2_link jsonb,
  c2_limitations text,
  obstacle_detection boolean,
  emergency_system text,
  control_station text,
  ane_authorization_doc_id uuid,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  payload_type text,
  length_m numeric,
  width_m numeric,
  diagonal_m numeric,
  takeoff_landing_type text,
  battery_system text,
  ane_authorization_path text
);

create table public.app_releases (
  id uuid default gen_random_uuid() not null,
  version_name text not null,
  version_code integer not null,
  apk_url text not null,
  release_notes text,
  force_update boolean default false not null,
  is_current boolean default true not null,
  created_at timestamp with time zone default now() not null
);

create table public.authorization_requests (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  zone text not null,
  scope_start date not null,
  scope_end date not null,
  total_flights_planned integer not null,
  status text default 'borrador'::text not null,
  submitted_at timestamp with time zone,
  radicado_number text,
  response_doc_id uuid,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.barriers (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  description text not null,
  category text,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.batteries (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  serial_number text not null,
  brand text,
  model text,
  cycles numeric default 0 not null,
  health_status text,
  status text default 'operativo'::text not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.c2_events (
  id uuid default gen_random_uuid() not null,
  session_id uuid not null,
  organization_id uuid not null,
  event_type text not null,
  payload jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null
);

create table public.c2_sessions (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  aircraft_id uuid,
  drone_sn text not null,
  status text default 'offline'::text not null,
  started_at timestamp with time zone default now() not null,
  last_heartbeat_at timestamp with time zone,
  ended_at timestamp with time zone,
  video_url text,
  created_at timestamp with time zone default now() not null
);

create table public.c2_telemetry (
  id bigint generated always as identity not null,
  session_id uuid not null,
  recorded_at timestamp with time zone default now() not null,
  latitude double precision,
  longitude double precision,
  height_m double precision,
  elevation_m double precision,
  attitude_pitch double precision,
  attitude_roll double precision,
  attitude_head double precision,
  horizontal_speed_ms double precision,
  vertical_speed_ms double precision,
  battery_pct integer,
  link_quality integer,
  mode_code text,
  mode_code_reason text
);

create table public.capacitacion_evaluation_attempts (
  id uuid default gen_random_uuid() not null,
  evaluation_id uuid not null,
  organization_id uuid not null,
  person_id uuid not null,
  attempt_number integer not null,
  answers jsonb not null,
  score numeric not null,
  passed boolean not null,
  created_at timestamp with time zone default now() not null
);

create table public.capacitacion_evaluation_questions (
  id uuid default gen_random_uuid() not null,
  evaluation_id uuid not null,
  question text not null,
  options jsonb not null,
  correct_index integer not null,
  order_index integer default 0 not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.capacitacion_evaluations (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  type text not null,
  title text not null,
  passing_score numeric not null,
  max_attempts integer not null,
  due_date date not null,
  material_title text,
  material_description text,
  material_path text,
  material_uploaded_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.checklists (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  name text not null,
  category text not null,
  description text,
  icon text,
  steps jsonb default '[]'::jsonb not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  version text default '1.0'::text not null
);

create table public.colombia_geo (
  code text not null,
  department text not null,
  municipality text not null
);

create table public.designations (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  person_id uuid not null,
  role_type text not null,
  started_at timestamp with time zone default now() not null,
  ended_at timestamp with time zone,
  resume_doc_id uuid,
  act_doc_id uuid,
  created_at timestamp with time zone default now() not null,
  profile jsonb,
  act_reference text,
  act_date date,
  act_document_path text,
  resume_document_path text
);

create table public.dispatch_checklist_items (
  id uuid default gen_random_uuid() not null,
  dispatch_id uuid not null,
  organization_id uuid not null,
  checklist_id uuid,
  checklist_name text not null,
  checklist_version text,
  "position" integer not null,
  step_text text not null,
  value text not null,
  note text,
  created_at timestamp with time zone default now() not null
);

create table public.dispatches (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  mission_id uuid not null,
  pilot_person_id uuid not null,
  aircraft_id uuid,
  dispatched_at timestamp with time zone default now() not null,
  gates jsonb default '[]'::jsonb not null,
  risk_evaluated boolean default false not null,
  risk_probability_code text,
  risk_severity_code text,
  risk_initial_zone text,
  risk_mitigation text,
  risk_mitigation_voluntary boolean default false not null,
  risk_residual_probability_code text,
  risk_residual_severity_code text,
  risk_residual_zone text,
  status text default 'despachado'::text not null,
  flight_id uuid,
  closed_at timestamp with time zone,
  close_notes text,
  safety_report boolean,
  safety_report_type text,
  created_at timestamp with time zone default now() not null
);

create table public.duty_annual_certifications (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  person_id uuid not null,
  year integer not null,
  total_hours numeric(8,2) not null,
  certified_by uuid not null,
  certified_at timestamp with time zone default now() not null,
  document_path text
);

create table public.duty_exceptions (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  duty_period_id uuid not null,
  reason text not null,
  authorized_by uuid not null,
  evidence_doc_id uuid,
  created_at timestamp with time zone default now() not null
);

create table public.duty_periods (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  person_id uuid not null,
  type text not null,
  started_at timestamp with time zone not null,
  ended_at timestamp with time zone,
  source text default 'manual'::text not null,
  created_at timestamp with time zone default now() not null
);

create table public.eta_items (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  brand text not null,
  model text not null,
  reta_number text,
  description text,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.etl_id_map (
  entity text not null,
  id_v1 text not null,
  id_v2 uuid not null,
  created_at timestamp with time zone default now() not null
);

create table public.flights (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  pilot_person_id uuid not null,
  aircraft_id uuid,
  mission_id uuid,
  takeoff_at timestamp with time zone not null,
  landing_at timestamp with time zone not null,
  total_time numeric(6,2) not null,
  visual_condition text,
  mission_type text,
  weather_observation_id uuid,
  replay_path text,
  created_at timestamp with time zone default now() not null,
  replay_track jsonb,
  location text,
  notes text,
  external_ref text,
  alerts jsonb,
  source text,
  flight_rules text
);

create table public.free_grants (
  id uuid default gen_random_uuid() not null,
  partner_id uuid,
  advisor_member_id uuid,
  email text not null,
  plan text default 'piloto'::text not null,
  status text default 'enviado'::text not null,
  token text not null,
  granted_at timestamp with time zone default now() not null,
  expires_at timestamp with time zone,
  purge_after timestamp with time zone,
  redeemed_organization_id uuid,
  welcome_shown_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  reminder_sent_at timestamp with time zone
);

create table public.hazards (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  description text not null,
  source text,
  mission_type text,
  related_barrier_id uuid,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.insurance_policies (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  policy_type text default 'rce'::text not null,
  insurer text not null,
  policy_number text not null,
  start_date date not null,
  end_date date not null,
  covers_all_fleet boolean default true not null,
  covered_amount_cop numeric(16,0),
  document_path text,
  notes text,
  is_active boolean default true not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.insurance_policy_aircraft (
  policy_id uuid not null,
  aircraft_id uuid not null
);

create table public.invitations (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  email text not null,
  name text,
  role text not null,
  person_id uuid,
  invited_by uuid,
  token text not null,
  status text default 'pendiente'::text not null,
  expires_at timestamp with time zone not null,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

create table public.legacy_v1_rows (
  source_table text not null,
  id_v1 text not null,
  data jsonb not null,
  archived_at timestamp with time zone default now() not null
);

create table public.legal_hold_events (
  id uuid default gen_random_uuid() not null,
  hold_id uuid not null,
  event_type text not null,
  actor_person_id uuid,
  flight_id uuid,
  detail text,
  created_at timestamp with time zone default now() not null
);

create table public.legal_hold_flights (
  hold_id uuid not null,
  flight_id uuid not null
);

create table public.legal_holds (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  reason text not null,
  sms_case_id uuid,
  opened_by uuid not null,
  opened_at timestamp with time zone default now() not null,
  released_at timestamp with time zone,
  released_by uuid,
  release_reason text
);

create table public.maintenance_events (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  aircraft_id uuid not null,
  task_id uuid,
  type text not null,
  performed_at timestamp with time zone default now() not null,
  performed_at_aircraft_hours numeric default 0 not null,
  performed_by uuid,
  findings text,
  return_to_service boolean default true not null,
  created_at timestamp with time zone default now() not null,
  document_path text
);

create table public.maintenance_programs (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  model_id uuid not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.maintenance_tasks (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  program_id uuid not null,
  name text not null,
  system_category text,
  interval_cycles numeric,
  interval_hours numeric,
  interval_calendar_days numeric,
  tolerance_value numeric,
  tolerance_unit text,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.manual_acknowledgments (
  id uuid default gen_random_uuid() not null,
  manual_id uuid not null,
  version_id uuid not null,
  organization_id uuid not null,
  person_id uuid not null,
  acknowledged_at timestamp with time zone default now() not null
);

create table public.manual_versions (
  id uuid default gen_random_uuid() not null,
  manual_id uuid not null,
  organization_id uuid not null,
  version text not null,
  effective_date date not null,
  file_path text not null,
  comments text,
  uploaded_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.manuales (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  title text not null,
  category text not null,
  current_version text,
  current_effective_date date,
  current_file_path text,
  current_version_id uuid,
  status text default 'active'::text not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.memberships (
  id uuid default gen_random_uuid() not null,
  person_id uuid not null,
  organization_id uuid not null,
  role text not null,
  status text default 'activa'::text not null,
  started_at timestamp with time zone default now() not null,
  ended_at timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

create table public.missions (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  pic_person_id uuid not null,
  aircraft_id uuid,
  authorization_id uuid,
  zone text not null,
  scheduled_at timestamp with time zone not null,
  status text default 'programada'::text not null,
  notes text,
  created_at timestamp with time zone default now() not null,
  zone_geo jsonb,
  name text not null,
  observer_person_id uuid,
  line_of_sight text,
  altitude_agl_m numeric,
  required_additions text[] default '{}'::text[] not null
);

create table public.notifications (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  person_id uuid not null,
  type text not null,
  title text not null,
  body text,
  link text,
  actor_person_id uuid,
  dedupe_key text,
  metadata jsonb,
  read_at timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

create table public.organization_certifications (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  cdo_number text,
  cdo_issued_at date,
  allowed_operation_types jsonb default '[]'::jsonb not null,
  allowed_visual_contact jsonb default '[]'::jsonb not null,
  opspecs_doc_id uuid,
  expires_at date,
  created_at timestamp with time zone default now() not null,
  dangerous_goods_declaration text,
  dangerous_goods_declared_at timestamp with time zone,
  dangerous_goods_declared_by uuid,
  dangerous_goods_notes text,
  dan_number text,
  operator_number text,
  registration_expiry date
);

create table public.organization_emergency_contacts (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  name text not null,
  role text,
  phone text,
  email text,
  notes text,
  created_at timestamp with time zone default now() not null
);

create table public.organization_monthly_cycles (
  organization_id uuid not null,
  year integer not null,
  month integer not null,
  cycles integer default 0 not null,
  updated_by uuid,
  updated_at timestamp with time zone default now() not null
);

create table public.organizations (
  id uuid default gen_random_uuid() not null,
  company_name text not null,
  nit text,
  domicile text,
  created_at timestamp with time zone default now() not null,
  logo_url text,
  sms_public_token text,
  legal_rep text,
  phone text,
  contact_email text,
  nit_type text
);

create table public.partner_codes (
  id uuid default gen_random_uuid() not null,
  partner_id uuid not null,
  code text not null,
  active boolean default true not null,
  created_at timestamp with time zone default now() not null
);

create table public.partner_invitations (
  id uuid default gen_random_uuid() not null,
  partner_id uuid not null,
  email text not null,
  role text default 'asesor'::text not null,
  token text not null,
  status text default 'pendiente'::text not null,
  invited_by uuid,
  created_at timestamp with time zone default now() not null,
  expires_at timestamp with time zone default (now() + '7 days'::interval) not null
);

create table public.partner_members (
  id uuid default gen_random_uuid() not null,
  partner_id uuid not null,
  person_id uuid not null,
  role text default 'asesor'::text not null,
  created_at timestamp with time zone default now() not null
);

create table public.partners (
  id uuid default gen_random_uuid() not null,
  type text not null,
  name text not null,
  status text default 'activo'::text not null,
  parent_partner_id uuid,
  commission_pct numeric default 0 not null,
  free_seats_limit integer,
  free_seats_used integer default 0 not null,
  free_days integer default 90 not null,
  logo_url text,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.pending_subscriptions (
  reference text not null,
  organization_id uuid not null,
  plan text not null,
  billing text not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  partner_code text
);

create table public.people (
  id uuid default gen_random_uuid() not null,
  full_name text not null,
  document_type text,
  document_number text,
  phone text,
  email text,
  license_number text,
  medical_cert_expiry date,
  medical_cert_doc_id uuid,
  created_at timestamp with time zone default now() not null,
  avatar_path text,
  emergency_contact_name text,
  emergency_contact_phone text
);

create table public.person_additions (
  id uuid default gen_random_uuid() not null,
  person_id uuid not null,
  addition text not null,
  valid_until date,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.person_documents (
  id uuid default gen_random_uuid() not null,
  person_id uuid not null,
  doc_type text not null,
  document_path text not null,
  uploaded_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.referral_commissions (
  id uuid default gen_random_uuid() not null,
  referral_id uuid not null,
  period text,
  sale_amount numeric,
  commission_pct numeric,
  commission_amount numeric,
  status text default 'pendiente'::text not null,
  payment_reference text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.referrals (
  id uuid default gen_random_uuid() not null,
  partner_id uuid,
  advisor_member_id uuid,
  organization_id uuid not null,
  code text,
  plan text,
  billing text,
  status text default 'activa'::text not null,
  created_at timestamp with time zone default now() not null
);

create table public.risk_analyses (
  id uuid default gen_random_uuid() not null,
  authorization_id uuid not null,
  hazards jsonb default '[]'::jsonb not null,
  can_sign boolean default false not null,
  signed_by uuid,
  signed_at timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

create table public.risk_assessments (
  id uuid default gen_random_uuid() not null,
  hazard_id uuid not null,
  organization_id uuid not null,
  probability_code integer not null,
  severity_code text not null,
  initial_zone text,
  mitigation text,
  residual_probability_code integer,
  residual_severity_code text,
  residual_zone text,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.risk_matrices (
  organization_id uuid not null,
  probability_levels jsonb default '[]'::jsonb not null,
  severity_levels jsonb default '[]'::jsonb not null,
  tolerability jsonb default '[]'::jsonb not null,
  updated_by uuid,
  updated_at timestamp with time zone default now() not null
);

create table public.safety_indicator_action_plans (
  id uuid default gen_random_uuid() not null,
  indicator_id uuid not null,
  organization_id uuid not null,
  defense_type text not null,
  root_cause text not null,
  trigger_under_control text not null,
  plan text not null,
  official_document text,
  execution_days integer,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.safety_indicator_monthly (
  id uuid default gen_random_uuid() not null,
  indicator_id uuid not null,
  organization_id uuid not null,
  year integer not null,
  month integer not null,
  events integer default 0 not null,
  rate numeric not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.safety_indicators (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  name text not null,
  taxonomy_code text,
  is_official boolean default false not null,
  active boolean default true not null,
  expected_improvement_pct numeric(5,4),
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.sms_case_actions (
  id uuid default gen_random_uuid() not null,
  case_id uuid not null,
  organization_id uuid not null,
  description text not null,
  responsible_id uuid,
  due_date date,
  done_at timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

create table public.sms_case_events (
  id uuid default gen_random_uuid() not null,
  case_id uuid not null,
  organization_id uuid not null,
  event_type text not null,
  payload jsonb default '{}'::jsonb not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.sms_cases (
  id uuid default gen_random_uuid() not null,
  report_id uuid not null,
  organization_id uuid not null,
  assigned_to uuid,
  status text default 'abierto'::text not null,
  closed_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  investigation_summary text,
  contributing_factors text,
  hazard_id uuid
);

create table public.sms_changes (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  title text not null,
  description text,
  change_type text default 'otro'::text not null,
  planned_date date,
  status text default 'identificado'::text not null,
  safety_impact text default 'por_evaluar'::text not null,
  impact_justification text,
  human_factors_notes text,
  hazard_id uuid,
  responsible_id uuid,
  decision_notes text,
  implemented_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.sms_gap_assessments (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  title text,
  assessment_date date default CURRENT_DATE not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.sms_gap_question_visibility (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  question_id uuid not null,
  hidden boolean default true not null,
  created_at timestamp with time zone default now() not null
);

create table public.sms_gap_questions (
  id uuid default gen_random_uuid() not null,
  organization_id uuid,
  component_number integer not null,
  component_name text not null,
  element_number text not null,
  element_name text not null,
  question_text text not null,
  order_index integer not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.sms_gap_responses (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  assessment_id uuid not null,
  question_id uuid not null,
  response text not null,
  evidence_date date,
  comments text,
  responsible text,
  status text default 'pendiente'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.sms_implementation_plan (
  organization_id uuid not null,
  plan_start_date date not null,
  horizon_months integer not null,
  created_by uuid,
  updated_at timestamp with time zone default now() not null
);

create table public.sms_implementation_tasks (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  phase integer not null,
  element_key text,
  label text not null,
  responsible_person_id uuid,
  responsible_name text,
  resources text,
  start_date date,
  end_date date,
  manual_done boolean default false not null,
  notes text,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.sms_monthly_reports (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  period text not null,
  sent_at timestamp with time zone default now() not null,
  sent_by uuid,
  notes text,
  created_at timestamp with time zone default now() not null
);

create table public.sms_objective_indicators (
  id uuid default gen_random_uuid() not null,
  objective_id uuid not null,
  indicator_id uuid not null,
  created_at timestamp with time zone default now() not null
);

create table public.sms_objectives (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  title text not null,
  metric_description text,
  target_value numeric,
  target_unit text,
  status text default 'activo'::text not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.sms_policies (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  policy_text text not null,
  scope text not null,
  effective_date date not null,
  signed_by uuid,
  signed_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.sms_report_attachments (
  id uuid default gen_random_uuid() not null,
  report_id uuid not null,
  organization_id uuid not null,
  storage_key text not null,
  file_name text not null,
  content_type text not null,
  size_bytes integer not null,
  uploaded_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.sms_reports (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  reported_by uuid,
  severity text not null,
  route text not null,
  requires_manager_analysis boolean default false not null,
  event_code text,
  description text not null,
  confidentiality_level text default 'normal'::text not null,
  source text default 'manual'::text not null,
  analyzed_by uuid,
  analyzed_at timestamp with time zone,
  filed_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  occurred_at timestamp with time zone,
  location text,
  aircraft_id uuid,
  flight_id uuid,
  event_label text,
  reporter_contact text,
  iris_reference text
);

create table public.sms_training_attendance (
  id uuid default gen_random_uuid() not null,
  session_id uuid not null,
  organization_id uuid not null,
  person_id uuid not null,
  occurrence_date date not null,
  attended_at timestamp with time zone default now() not null,
  recorded_by uuid
);

create table public.sms_training_sessions (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  topic text not null,
  recurrence text not null,
  recurrence_days integer,
  start_date date not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.subscriptions (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  plan text default 'piloto'::text not null,
  expires_at date,
  notes text,
  updated_by uuid,
  updated_at timestamp with time zone default now() not null,
  created_at timestamp with time zone default now() not null,
  billing text,
  payment_provider text,
  wompi_payment_source_id text,
  migrated_from_v1 boolean default false not null,
  legacy_epayco_subscription_id text,
  migration_notice_sent_at timestamp with time zone
);

create table public.supplier_audit_criteria (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  criterion text not null,
  category text,
  order_index integer default 0 not null,
  created_at timestamp with time zone default now() not null
);

create table public.supplier_audits (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  supplier_id uuid not null,
  audit_date date not null,
  auditor_name text not null,
  responses jsonb default '{}'::jsonb not null,
  overall_notes text,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.suppliers (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  name text not null,
  category text,
  nit text,
  contact text,
  is_active boolean default true not null,
  notes text,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.training_exam_attempts (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  person_id uuid not null,
  cycle_start date not null,
  attempt_number integer not null,
  answers jsonb not null,
  score numeric(5,2) not null,
  passed boolean not null,
  created_at timestamp with time zone default now() not null,
  type text not null
);

create table public.training_exam_questions (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  question text not null,
  options jsonb not null,
  correct_index integer not null,
  order_index integer default 0 not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  type text not null
);

create table public.training_exams (
  organization_id uuid not null,
  passing_score numeric(5,2) not null,
  max_attempts integer not null,
  recurrence text not null,
  recurrence_days integer,
  start_date date not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  type text not null
);

create table public.unexpected_events (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  aircraft_id uuid not null,
  flight_id uuid,
  type text not null,
  description text,
  reported_by uuid,
  reported_at timestamp with time zone default now() not null,
  evaluated boolean default false not null,
  evaluated_by uuid,
  evaluated_at timestamp with time zone,
  evaluation_result text,
  evaluation_notes text,
  evaluation_doc_id uuid,
  created_at timestamp with time zone default now() not null
);

create table public.weather_observations (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  dispatch_id uuid,
  lat numeric not null,
  lon numeric not null,
  observed_at timestamp with time zone not null,
  source text not null,
  payload jsonb not null,
  created_at timestamp with time zone default now() not null
);

create table public.wompi_processed_refs (
  tx_id text not null,
  created_at timestamp with time zone default now() not null
);

-- ============ Restricciones ============
alter table public.accounts add constraint accounts_auth_user_id_key UNIQUE (auth_user_id);
alter table public.accounts add constraint accounts_pkey PRIMARY KEY (id);
alter table public.aircraft add constraint aircraft_actual_weight_kg_check CHECK (((actual_weight_kg IS NULL) OR (actual_weight_kg > (0)::numeric)));
alter table public.aircraft add constraint aircraft_operational_status_check CHECK ((operational_status = ANY (ARRAY['disponible'::text, 'en_mantenimiento'::text, 'fuera_de_servicio'::text])));
alter table public.aircraft add constraint aircraft_organization_id_serial_number_key UNIQUE (organization_id, serial_number);
alter table public.aircraft add constraint aircraft_ownership_type_check CHECK ((ownership_type = ANY (ARRAY['propiedad'::text, 'arrendamiento'::text, 'comodato'::text])));
alter table public.aircraft add constraint aircraft_pkey PRIMARY KEY (id);
alter table public.aircraft_components add constraint aircraft_components_pkey PRIMARY KEY (id);
alter table public.aircraft_components add constraint aircraft_components_status_check CHECK ((status = ANY (ARRAY['activo'::text, 'retirado'::text])));
alter table public.aircraft_models add constraint aircraft_models_category_check CHECK ((category = ANY (ARRAY['ala_fija'::text, 'ala_rotatoria'::text, 'mixta'::text])));
alter table public.aircraft_models add constraint aircraft_models_diagonal_m_check CHECK (((diagonal_m IS NULL) OR (diagonal_m > (0)::numeric)));
alter table public.aircraft_models add constraint aircraft_models_length_m_check CHECK (((length_m IS NULL) OR (length_m > (0)::numeric)));
alter table public.aircraft_models add constraint aircraft_models_pkey PRIMARY KEY (id);
alter table public.aircraft_models add constraint aircraft_models_takeoff_landing_type_check CHECK (((takeoff_landing_type IS NULL) OR (takeoff_landing_type = ANY (ARRAY['VTOL'::text, 'CTOL'::text, 'STOL'::text, 'HTOL'::text, 'lanzamiento'::text, 'catapulta'::text]))));
alter table public.aircraft_models add constraint aircraft_models_width_m_check CHECK (((width_m IS NULL) OR (width_m > (0)::numeric)));
alter table public.app_releases add constraint app_releases_pkey PRIMARY KEY (id);
alter table public.authorization_requests add constraint authorization_requests_pkey PRIMARY KEY (id);
alter table public.authorization_requests add constraint authorization_requests_scope_valid CHECK ((scope_end >= scope_start));
alter table public.authorization_requests add constraint authorization_requests_status_check CHECK ((status = ANY (ARRAY['borrador'::text, 'radicado'::text, 'en_revision'::text, 'autorizado'::text, 'negado'::text])));
alter table public.authorization_requests add constraint authorization_requests_total_flights_planned_check CHECK ((total_flights_planned > 0));
alter table public.barriers add constraint barriers_pkey PRIMARY KEY (id);
alter table public.batteries add constraint batteries_health_status_check CHECK ((health_status = ANY (ARRAY['buena'::text, 'regular'::text, 'mala'::text])));
alter table public.batteries add constraint batteries_organization_id_serial_number_key UNIQUE (organization_id, serial_number);
alter table public.batteries add constraint batteries_pkey PRIMARY KEY (id);
alter table public.batteries add constraint batteries_status_check CHECK ((status = ANY (ARRAY['operativo'::text, 'baja'::text])));
alter table public.c2_events add constraint c2_events_pkey PRIMARY KEY (id);
alter table public.c2_sessions add constraint c2_sessions_pkey PRIMARY KEY (id);
alter table public.c2_sessions add constraint c2_sessions_status_check CHECK ((status = ANY (ARRAY['online'::text, 'offline'::text])));
alter table public.c2_telemetry add constraint c2_telemetry_pkey PRIMARY KEY (id);
alter table public.capacitacion_evaluation_attempts add constraint capacitacion_evaluation_attem_evaluation_id_person_id_attem_key UNIQUE (evaluation_id, person_id, attempt_number);
alter table public.capacitacion_evaluation_attempts add constraint capacitacion_evaluation_attempts_pkey PRIMARY KEY (id);
alter table public.capacitacion_evaluation_questions add constraint capacitacion_evaluation_questions_pkey PRIMARY KEY (id);
alter table public.capacitacion_evaluations add constraint capacitacion_evaluations_max_attempts_check CHECK ((max_attempts >= 1));
alter table public.capacitacion_evaluations add constraint capacitacion_evaluations_passing_score_check CHECK (((passing_score >= (0)::numeric) AND (passing_score <= (100)::numeric)));
alter table public.capacitacion_evaluations add constraint capacitacion_evaluations_pkey PRIMARY KEY (id);
alter table public.capacitacion_evaluations add constraint capacitacion_evaluations_type_check CHECK ((type = ANY (ARRAY['operaciones'::text, 'mantenimiento'::text, 'seguridad_operacional'::text])));
alter table public.checklists add constraint checklists_category_check CHECK ((category = ANY (ARRAY['Prevuelo'::text, 'Reportes'::text, 'Seguridad Operacional'::text, 'Mantenimiento'::text])));
alter table public.checklists add constraint checklists_pkey PRIMARY KEY (id);
alter table public.colombia_geo add constraint colombia_geo_pkey PRIMARY KEY (code);
alter table public.designations add constraint designations_pkey PRIMARY KEY (id);
alter table public.designations add constraint designations_role_type_check CHECK ((role_type = ANY (ARRAY['jefe_pilotos'::text, 'gerente_sms'::text, 'ejecutivo_responsable'::text])));
alter table public.dispatch_checklist_items add constraint dispatch_checklist_items_pkey PRIMARY KEY (id);
alter table public.dispatch_checklist_items add constraint dispatch_checklist_items_value_check CHECK ((value = ANY (ARRAY['si'::text, 'no'::text, 'na'::text])));
alter table public.dispatches add constraint dispatches_close_consistent CHECK (((status = 'cerrado'::text) = ((flight_id IS NOT NULL) AND (closed_at IS NOT NULL))));
alter table public.dispatches add constraint dispatches_flight_id_key UNIQUE (flight_id);
alter table public.dispatches add constraint dispatches_mission_id_key UNIQUE (mission_id);
alter table public.dispatches add constraint dispatches_pkey PRIMARY KEY (id);
alter table public.dispatches add constraint dispatches_safety_report_type_check CHECK ((safety_report_type = ANY (ARRAY['VOR'::text, 'MOR'::text])));
alter table public.dispatches add constraint dispatches_safety_type_consistent CHECK (((safety_report IS DISTINCT FROM true) OR (safety_report_type IS NOT NULL)));
alter table public.dispatches add constraint dispatches_status_check CHECK ((status = ANY (ARRAY['despachado'::text, 'cerrado'::text])));
alter table public.duty_annual_certifications add constraint duty_annual_certifications_person_id_year_key UNIQUE (person_id, year);
alter table public.duty_annual_certifications add constraint duty_annual_certifications_pkey PRIMARY KEY (id);
alter table public.duty_exceptions add constraint duty_exceptions_pkey PRIMARY KEY (id);
alter table public.duty_periods add constraint duty_periods_ended_after_started CHECK (((ended_at IS NULL) OR (ended_at > started_at)));
alter table public.duty_periods add constraint duty_periods_pkey PRIMARY KEY (id);
alter table public.duty_periods add constraint duty_periods_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'auto_dispatch'::text, 'auto_close'::text])));
alter table public.duty_periods add constraint duty_periods_type_check CHECK ((type = ANY (ARRAY['servicio'::text, 'descanso'::text, 'disponibilidad'::text, 'entrenamiento'::text])));
alter table public.eta_items add constraint eta_items_pkey PRIMARY KEY (id);
alter table public.etl_id_map add constraint etl_id_map_pkey PRIMARY KEY (entity, id_v1);
alter table public.flights add constraint flights_flight_rules_check CHECK (((flight_rules IS NULL) OR (flight_rules = ANY (ARRAY['VMC'::text, 'IMC'::text, 'NIGHT'::text]))));
alter table public.flights add constraint flights_landing_after_takeoff CHECK ((landing_at > takeoff_at));
alter table public.flights add constraint flights_pkey PRIMARY KEY (id);
alter table public.flights add constraint flights_source_check CHECK (((source IS NULL) OR (source = ANY (ARRAY['manual'::text, 'importado'::text, 'despacho'::text]))));
alter table public.flights add constraint flights_total_time_positive CHECK ((total_time > (0)::numeric));
alter table public.flights add constraint flights_visual_condition_check CHECK ((visual_condition = ANY (ARRAY['VLOS'::text, 'EVLOS'::text, 'BVLOS'::text])));
alter table public.free_grants add constraint free_grants_email_key UNIQUE (email);
alter table public.free_grants add constraint free_grants_pkey PRIMARY KEY (id);
alter table public.free_grants add constraint free_grants_plan_check CHECK ((plan = ANY (ARRAY['piloto'::text, 'escuadrilla'::text, 'flota'::text, 'enterprise'::text])));
alter table public.free_grants add constraint free_grants_status_check CHECK ((status = ANY (ARRAY['enviado'::text, 'activado'::text, 'expirado'::text, 'degradado'::text, 'purgado'::text])));
alter table public.free_grants add constraint free_grants_token_key UNIQUE (token);
alter table public.hazards add constraint hazards_pkey PRIMARY KEY (id);
alter table public.insurance_policies add constraint insurance_policies_covered_amount_cop_check CHECK (((covered_amount_cop IS NULL) OR (covered_amount_cop >= (0)::numeric)));
alter table public.insurance_policies add constraint insurance_policies_dates_check CHECK ((end_date >= start_date));
alter table public.insurance_policies add constraint insurance_policies_number_unique UNIQUE (organization_id, insurer, policy_number);
alter table public.insurance_policies add constraint insurance_policies_pkey PRIMARY KEY (id);
alter table public.insurance_policies add constraint insurance_policies_policy_type_check CHECK ((policy_type = ANY (ARRAY['rce'::text, 'casco'::text, 'otra'::text])));
alter table public.insurance_policy_aircraft add constraint insurance_policy_aircraft_pkey PRIMARY KEY (policy_id, aircraft_id);
alter table public.invitations add constraint invitations_pkey PRIMARY KEY (id);
alter table public.invitations add constraint invitations_role_check CHECK ((role = ANY (ARRAY['piloto'::text, 'jefe_pilotos'::text, 'gerente_sms'::text, 'admin'::text])));
alter table public.invitations add constraint invitations_status_check CHECK ((status = ANY (ARRAY['pendiente'::text, 'aceptada'::text, 'revocada'::text, 'expirada'::text])));
alter table public.invitations add constraint invitations_token_key UNIQUE (token);
alter table public.legacy_v1_rows add constraint legacy_v1_rows_pkey PRIMARY KEY (source_table, id_v1);
alter table public.legal_hold_events add constraint legal_hold_events_event_type_check CHECK ((event_type = ANY (ARRAY['opened'::text, 'flights_added'::text, 'released'::text, 'accessed'::text])));
alter table public.legal_hold_events add constraint legal_hold_events_pkey PRIMARY KEY (id);
alter table public.legal_hold_flights add constraint legal_hold_flights_pkey PRIMARY KEY (hold_id, flight_id);
alter table public.legal_holds add constraint legal_holds_pkey PRIMARY KEY (id);
alter table public.legal_holds add constraint legal_holds_reason_check CHECK ((length(btrim(reason)) > 0));
alter table public.legal_holds add constraint legal_holds_release_consistent CHECK ((((released_at IS NULL) = (released_by IS NULL)) AND ((released_at IS NULL) = (release_reason IS NULL))));
alter table public.maintenance_events add constraint maintenance_events_pkey PRIMARY KEY (id);
alter table public.maintenance_events add constraint maintenance_events_type_check CHECK ((type = ANY (ARRAY['programado'::text, 'correctivo'::text, 'menor'::text])));
alter table public.maintenance_programs add constraint maintenance_programs_model_id_key UNIQUE (model_id);
alter table public.maintenance_programs add constraint maintenance_programs_pkey PRIMARY KEY (id);
alter table public.maintenance_tasks add constraint maintenance_tasks_has_interval CHECK (((interval_cycles IS NOT NULL) OR (interval_hours IS NOT NULL) OR (interval_calendar_days IS NOT NULL)));
alter table public.maintenance_tasks add constraint maintenance_tasks_pkey PRIMARY KEY (id);
alter table public.maintenance_tasks add constraint maintenance_tasks_tolerance_unit_check CHECK ((tolerance_unit = ANY (ARRAY['pct'::text, 'hours'::text, 'days'::text, 'cycles'::text])));
alter table public.manual_acknowledgments add constraint manual_acknowledgments_pkey PRIMARY KEY (id);
alter table public.manual_acknowledgments add constraint manual_acknowledgments_version_id_person_id_key UNIQUE (version_id, person_id);
alter table public.manual_versions add constraint manual_versions_pkey PRIMARY KEY (id);
alter table public.manuales add constraint manuales_category_check CHECK ((category = ANY (ARRAY['MO'::text, 'SMS'::text, 'MANTENIMIENTO'::text, 'ORGANIZACION'::text, 'SOP'::text, 'OTRO'::text])));
alter table public.manuales add constraint manuales_pkey PRIMARY KEY (id);
alter table public.manuales add constraint manuales_status_check CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text])));
alter table public.memberships add constraint memberships_ended_after_started CHECK (((ended_at IS NULL) OR (ended_at > started_at)));
alter table public.memberships add constraint memberships_pkey PRIMARY KEY (id);
alter table public.memberships add constraint memberships_status_check CHECK ((status = ANY (ARRAY['activa'::text, 'cerrada'::text])));
alter table public.missions add constraint missions_line_of_sight_check CHECK ((line_of_sight = ANY (ARRAY['VLOS'::text, 'EVLOS'::text, 'BVLOS'::text])));
alter table public.missions add constraint missions_pkey PRIMARY KEY (id);
alter table public.missions add constraint missions_status_check CHECK ((status = ANY (ARRAY['programada'::text, 'despachada'::text, 'cerrada'::text, 'cancelada'::text])));
alter table public.notifications add constraint notifications_link_check CHECK (((link IS NULL) OR ((link ~~ '/%'::text) AND (link !~~ '//%'::text))));
alter table public.notifications add constraint notifications_pkey PRIMARY KEY (id);
alter table public.notifications add constraint notifications_title_check CHECK ((length(btrim(title)) > 0));
alter table public.notifications add constraint notifications_type_check CHECK ((type = ANY (ARRAY['mision_programada'::text, 'manual_publicado'::text, 'miembro_nuevo'::text, 'sms_reporte'::text, 'sms_caso_asignado'::text, 'sms_plazo'::text, 'custodia_abierta'::text, 'vencimiento'::text, 'anuncio'::text, 'sistema'::text])));
alter table public.organization_certifications add constraint organization_certifications_dangerous_goods_declaration_check CHECK (((dangerous_goods_declaration IS NULL) OR (dangerous_goods_declaration = ANY (ARRAY['no_transporta'::text, 'transporta'::text]))));
alter table public.organization_certifications add constraint organization_certifications_organization_id_key UNIQUE (organization_id);
alter table public.organization_certifications add constraint organization_certifications_pkey PRIMARY KEY (id);
alter table public.organization_emergency_contacts add constraint organization_emergency_contacts_pkey PRIMARY KEY (id);
alter table public.organization_monthly_cycles add constraint organization_monthly_cycles_cycles_check CHECK ((cycles >= 0));
alter table public.organization_monthly_cycles add constraint organization_monthly_cycles_month_check CHECK (((month >= 1) AND (month <= 12)));
alter table public.organization_monthly_cycles add constraint organization_monthly_cycles_pkey PRIMARY KEY (organization_id, year, month);
alter table public.organizations add constraint organizations_pkey PRIMARY KEY (id);
alter table public.organizations add constraint organizations_sms_public_token_key UNIQUE (sms_public_token);
alter table public.partner_codes add constraint partner_codes_code_key UNIQUE (code);
alter table public.partner_codes add constraint partner_codes_pkey PRIMARY KEY (id);
alter table public.partner_invitations add constraint partner_invitations_pkey PRIMARY KEY (id);
alter table public.partner_invitations add constraint partner_invitations_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'asesor'::text])));
alter table public.partner_invitations add constraint partner_invitations_status_check CHECK ((status = ANY (ARRAY['pendiente'::text, 'aceptada'::text, 'expirada'::text, 'revocada'::text])));
alter table public.partner_invitations add constraint partner_invitations_token_key UNIQUE (token);
alter table public.partner_members add constraint partner_members_partner_id_person_id_key UNIQUE (partner_id, person_id);
alter table public.partner_members add constraint partner_members_pkey PRIMARY KEY (id);
alter table public.partner_members add constraint partner_members_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'asesor'::text])));
alter table public.partners add constraint partners_commission_pct_check CHECK (((commission_pct >= (0)::numeric) AND (commission_pct <= (100)::numeric)));
alter table public.partners add constraint partners_free_days_check CHECK ((free_days > 0));
alter table public.partners add constraint partners_free_seats_limit_check CHECK (((free_seats_limit IS NULL) OR (free_seats_limit >= 0)));
alter table public.partners add constraint partners_free_seats_used_check CHECK ((free_seats_used >= 0));
alter table public.partners add constraint partners_pkey PRIMARY KEY (id);
alter table public.partners add constraint partners_status_check CHECK ((status = ANY (ARRAY['activo'::text, 'inactivo'::text])));
alter table public.partners add constraint partners_type_check CHECK ((type = ANY (ARRAY['escuela'::text, 'asesor'::text])));
alter table public.pending_subscriptions add constraint pending_subscriptions_billing_check CHECK ((billing = ANY (ARRAY['monthly'::text, 'annual'::text])));
alter table public.pending_subscriptions add constraint pending_subscriptions_pkey PRIMARY KEY (reference);
alter table public.pending_subscriptions add constraint pending_subscriptions_plan_check CHECK ((plan = ANY (ARRAY['piloto'::text, 'escuadrilla'::text, 'flota'::text])));
alter table public.people add constraint people_pkey PRIMARY KEY (id);
alter table public.person_additions add constraint person_additions_person_id_addition_key UNIQUE (person_id, addition);
alter table public.person_additions add constraint person_additions_pkey PRIMARY KEY (id);
alter table public.person_documents add constraint person_documents_doc_type_check CHECK ((doc_type = ANY (ARRAY['cedula'::text, 'curso_piloto'::text, 'examen_teorico'::text, 'certificado_medico'::text, 'otro'::text])));
alter table public.person_documents add constraint person_documents_person_id_doc_type_key UNIQUE (person_id, doc_type);
alter table public.person_documents add constraint person_documents_pkey PRIMARY KEY (id);
alter table public.referral_commissions add constraint referral_commissions_payment_reference_key UNIQUE (payment_reference);
alter table public.referral_commissions add constraint referral_commissions_pkey PRIMARY KEY (id);
alter table public.referral_commissions add constraint referral_commissions_status_check CHECK ((status = ANY (ARRAY['pendiente'::text, 'liquidada'::text, 'anulada'::text])));
alter table public.referrals add constraint referrals_organization_id_key UNIQUE (organization_id);
alter table public.referrals add constraint referrals_pkey PRIMARY KEY (id);
alter table public.referrals add constraint referrals_status_check CHECK ((status = ANY (ARRAY['activa'::text, 'cancelada'::text])));
alter table public.risk_analyses add constraint risk_analyses_pkey PRIMARY KEY (id);
alter table public.risk_analyses add constraint risk_analyses_signed_consistent CHECK ((((signed_by IS NULL) AND (signed_at IS NULL)) OR ((signed_by IS NOT NULL) AND (signed_at IS NOT NULL))));
alter table public.risk_assessments add constraint risk_assessments_pkey PRIMARY KEY (id);
alter table public.risk_matrices add constraint risk_matrices_pkey PRIMARY KEY (organization_id);
alter table public.safety_indicator_action_plans add constraint safety_indicator_action_plans_defense_type_check CHECK ((defense_type = ANY (ARRAY['T'::text, 'R'::text, 'E'::text])));
alter table public.safety_indicator_action_plans add constraint safety_indicator_action_plans_execution_days_check CHECK ((execution_days > 0));
alter table public.safety_indicator_action_plans add constraint safety_indicator_action_plans_pkey PRIMARY KEY (id);
alter table public.safety_indicator_monthly add constraint safety_indicator_monthly_events_check CHECK ((events >= 0));
alter table public.safety_indicator_monthly add constraint safety_indicator_monthly_indicator_id_year_month_key UNIQUE (indicator_id, year, month);
alter table public.safety_indicator_monthly add constraint safety_indicator_monthly_month_check CHECK (((month >= 1) AND (month <= 12)));
alter table public.safety_indicator_monthly add constraint safety_indicator_monthly_pkey PRIMARY KEY (id);
alter table public.safety_indicators add constraint safety_indicators_pkey PRIMARY KEY (id);
alter table public.sms_case_actions add constraint sms_case_actions_pkey PRIMARY KEY (id);
alter table public.sms_case_events add constraint sms_case_events_pkey PRIMARY KEY (id);
alter table public.sms_cases add constraint sms_cases_pkey PRIMARY KEY (id);
alter table public.sms_cases add constraint sms_cases_report_id_key UNIQUE (report_id);
alter table public.sms_cases add constraint sms_cases_status_check CHECK ((status = ANY (ARRAY['abierto'::text, 'en_analisis'::text, 'cerrado'::text])));
alter table public.sms_changes add constraint sms_changes_change_type_check CHECK ((change_type = ANY (ARRAY['flota'::text, 'procedimientos'::text, 'personal'::text, 'organizacion'::text, 'infraestructura'::text, 'normativo'::text, 'otro'::text])));
alter table public.sms_changes add constraint sms_changes_pkey PRIMARY KEY (id);
alter table public.sms_changes add constraint sms_changes_safety_impact_check CHECK ((safety_impact = ANY (ARRAY['por_evaluar'::text, 'si'::text, 'no'::text])));
alter table public.sms_changes add constraint sms_changes_status_check CHECK ((status = ANY (ARRAY['identificado'::text, 'evaluado'::text, 'implementado'::text, 'descartado'::text])));
alter table public.sms_gap_assessments add constraint sms_gap_assessments_pkey PRIMARY KEY (id);
alter table public.sms_gap_question_visibility add constraint sms_gap_question_visibility_organization_id_question_id_key UNIQUE (organization_id, question_id);
alter table public.sms_gap_question_visibility add constraint sms_gap_question_visibility_pkey PRIMARY KEY (id);
alter table public.sms_gap_questions add constraint sms_gap_questions_component_number_check CHECK (((component_number >= 1) AND (component_number <= 5)));
alter table public.sms_gap_questions add constraint sms_gap_questions_pkey PRIMARY KEY (id);
alter table public.sms_gap_responses add constraint sms_gap_responses_assessment_id_question_id_key UNIQUE (assessment_id, question_id);
alter table public.sms_gap_responses add constraint sms_gap_responses_pkey PRIMARY KEY (id);
alter table public.sms_gap_responses add constraint sms_gap_responses_response_check CHECK ((response = ANY (ARRAY['si'::text, 'no'::text])));
alter table public.sms_gap_responses add constraint sms_gap_responses_status_check CHECK ((status = ANY (ARRAY['pendiente'::text, 'en_progreso'::text, 'completado'::text])));
alter table public.sms_implementation_plan add constraint sms_implementation_plan_horizon_months_check CHECK (((horizon_months >= 12) AND (horizon_months <= 24)));
alter table public.sms_implementation_plan add constraint sms_implementation_plan_pkey PRIMARY KEY (organization_id);
alter table public.sms_implementation_tasks add constraint sms_implementation_tasks_phase_check CHECK (((phase >= 1) AND (phase <= 4)));
alter table public.sms_implementation_tasks add constraint sms_implementation_tasks_pkey PRIMARY KEY (id);
alter table public.sms_monthly_reports add constraint sms_monthly_reports_organization_id_period_key UNIQUE (organization_id, period);
alter table public.sms_monthly_reports add constraint sms_monthly_reports_pkey PRIMARY KEY (id);
alter table public.sms_objective_indicators add constraint sms_objective_indicators_objective_id_indicator_id_key UNIQUE (objective_id, indicator_id);
alter table public.sms_objective_indicators add constraint sms_objective_indicators_pkey PRIMARY KEY (id);
alter table public.sms_objectives add constraint sms_objectives_pkey PRIMARY KEY (id);
alter table public.sms_objectives add constraint sms_objectives_status_check CHECK ((status = ANY (ARRAY['activo'::text, 'archivado'::text])));
alter table public.sms_policies add constraint sms_policies_pkey PRIMARY KEY (id);
alter table public.sms_report_attachments add constraint sms_report_attachments_pkey PRIMARY KEY (id);
alter table public.sms_report_attachments add constraint sms_report_attachments_size_bytes_check CHECK ((size_bytes > 0));
alter table public.sms_reports add constraint sms_reports_confidentiality_level_check CHECK ((confidentiality_level = ANY (ARRAY['normal'::text, 'confidencial'::text])));
alter table public.sms_reports add constraint sms_reports_pkey PRIMARY KEY (id);
alter table public.sms_reports add constraint sms_reports_route_check CHECK ((route = ANY (ARRAY['mor'::text, 'vor'::text, 'rac114'::text])));
alter table public.sms_reports add constraint sms_reports_severity_check CHECK ((severity = ANY (ARRAY['incidente'::text, 'incidente_grave'::text, 'accidente'::text])));
alter table public.sms_reports add constraint sms_reports_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'public'::text, 'auto_duty_exception'::text, 'auto_unexpected_event'::text, 'auto_training_exam_failed'::text])));
alter table public.sms_training_attendance add constraint sms_training_attendance_pkey PRIMARY KEY (id);
alter table public.sms_training_attendance add constraint sms_training_attendance_session_id_person_id_occurrence_dat_key UNIQUE (session_id, person_id, occurrence_date);
alter table public.sms_training_sessions add constraint sms_training_sessions_custom_days CHECK ((((recurrence = 'personalizado'::text) AND (recurrence_days IS NOT NULL)) OR (recurrence <> 'personalizado'::text)));
alter table public.sms_training_sessions add constraint sms_training_sessions_pkey PRIMARY KEY (id);
alter table public.sms_training_sessions add constraint sms_training_sessions_recurrence_check CHECK ((recurrence = ANY (ARRAY['semanal'::text, 'quincenal'::text, 'mensual'::text, 'personalizado'::text])));
alter table public.sms_training_sessions add constraint sms_training_sessions_recurrence_days_check CHECK ((recurrence_days > 0));
alter table public.subscriptions add constraint subscriptions_billing_check CHECK ((billing = ANY (ARRAY['monthly'::text, 'annual'::text])));
alter table public.subscriptions add constraint subscriptions_organization_id_key UNIQUE (organization_id);
alter table public.subscriptions add constraint subscriptions_payment_provider_check CHECK ((payment_provider = 'wompi'::text));
alter table public.subscriptions add constraint subscriptions_pkey PRIMARY KEY (id);
alter table public.subscriptions add constraint subscriptions_plan_check CHECK ((plan = ANY (ARRAY['piloto'::text, 'escuadrilla'::text, 'flota'::text, 'enterprise'::text])));
alter table public.supplier_audit_criteria add constraint supplier_audit_criteria_pkey PRIMARY KEY (id);
alter table public.supplier_audits add constraint supplier_audits_pkey PRIMARY KEY (id);
alter table public.suppliers add constraint suppliers_pkey PRIMARY KEY (id);
alter table public.training_exam_attempts add constraint training_exam_attempts_pkey PRIMARY KEY (id);
alter table public.training_exam_attempts add constraint training_exam_attempts_type_check CHECK ((type = ANY (ARRAY['operaciones'::text, 'mantenimiento'::text, 'seguridad_operacional'::text])));
alter table public.training_exam_attempts add constraint training_exam_attempts_unique UNIQUE (person_id, type, cycle_start, attempt_number);
alter table public.training_exam_questions add constraint training_exam_questions_pkey PRIMARY KEY (id);
alter table public.training_exam_questions add constraint training_exam_questions_type_check CHECK ((type = ANY (ARRAY['operaciones'::text, 'mantenimiento'::text, 'seguridad_operacional'::text])));
alter table public.training_exams add constraint training_exams_custom_days CHECK ((((recurrence = 'personalizado'::text) AND (recurrence_days IS NOT NULL)) OR (recurrence <> 'personalizado'::text)));
alter table public.training_exams add constraint training_exams_max_attempts_check CHECK ((max_attempts > 0));
alter table public.training_exams add constraint training_exams_passing_score_check CHECK (((passing_score >= (0)::numeric) AND (passing_score <= (100)::numeric)));
alter table public.training_exams add constraint training_exams_pkey PRIMARY KEY (organization_id, type);
alter table public.training_exams add constraint training_exams_recurrence_check CHECK ((recurrence = ANY (ARRAY['semanal'::text, 'quincenal'::text, 'mensual'::text, 'personalizado'::text])));
alter table public.training_exams add constraint training_exams_recurrence_days_check CHECK ((recurrence_days > 0));
alter table public.training_exams add constraint training_exams_type_check CHECK ((type = ANY (ARRAY['operaciones'::text, 'mantenimiento'::text, 'seguridad_operacional'::text])));
alter table public.unexpected_events add constraint unexpected_events_evaluation_consistency CHECK ((((evaluated = false) AND (evaluated_by IS NULL) AND (evaluated_at IS NULL) AND (evaluation_result IS NULL)) OR ((evaluated = true) AND (evaluated_by IS NOT NULL) AND (evaluated_at IS NOT NULL) AND (evaluation_result IS NOT NULL))));
alter table public.unexpected_events add constraint unexpected_events_evaluation_result_check CHECK ((evaluation_result = ANY (ARRAY['aeronavegable'::text, 'requiere_mantenimiento'::text, 'fuera_de_servicio'::text])));
alter table public.unexpected_events add constraint unexpected_events_pkey PRIMARY KEY (id);
alter table public.unexpected_events add constraint unexpected_events_type_check CHECK ((type = ANY (ARRAY['aterrizaje_fuerte'::text, 'impacto_aves'::text, 'fod'::text, 'perdida_helice'::text])));
alter table public.weather_observations add constraint weather_observations_dispatch_id_key UNIQUE (dispatch_id);
alter table public.weather_observations add constraint weather_observations_pkey PRIMARY KEY (id);
alter table public.wompi_processed_refs add constraint wompi_processed_refs_pkey PRIMARY KEY (tx_id);
alter table public.accounts add constraint accounts_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.accounts add constraint accounts_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;
alter table public.aircraft add constraint aircraft_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.aircraft add constraint aircraft_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.aircraft_models(id) ON DELETE RESTRICT;
alter table public.aircraft add constraint aircraft_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.aircraft_components add constraint aircraft_components_aircraft_id_fkey FOREIGN KEY (aircraft_id) REFERENCES public.aircraft(id) ON DELETE CASCADE;
alter table public.aircraft_components add constraint aircraft_components_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.aircraft_components add constraint aircraft_components_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.aircraft_models add constraint aircraft_models_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.aircraft_models add constraint aircraft_models_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.authorization_requests add constraint authorization_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id);
alter table public.authorization_requests add constraint authorization_requests_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.barriers add constraint barriers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id);
alter table public.barriers add constraint barriers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.batteries add constraint batteries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.batteries add constraint batteries_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.c2_events add constraint c2_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.c2_events add constraint c2_events_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.c2_sessions(id) ON DELETE CASCADE;
alter table public.c2_sessions add constraint c2_sessions_aircraft_id_fkey FOREIGN KEY (aircraft_id) REFERENCES public.aircraft(id);
alter table public.c2_sessions add constraint c2_sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.c2_telemetry add constraint c2_telemetry_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.c2_sessions(id) ON DELETE CASCADE;
alter table public.capacitacion_evaluation_attempts add constraint capacitacion_evaluation_attempts_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES public.capacitacion_evaluations(id) ON DELETE CASCADE;
alter table public.capacitacion_evaluation_attempts add constraint capacitacion_evaluation_attempts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.capacitacion_evaluation_attempts add constraint capacitacion_evaluation_attempts_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;
alter table public.capacitacion_evaluation_questions add constraint capacitacion_evaluation_questions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id);
alter table public.capacitacion_evaluation_questions add constraint capacitacion_evaluation_questions_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES public.capacitacion_evaluations(id) ON DELETE CASCADE;
alter table public.capacitacion_evaluations add constraint capacitacion_evaluations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id);
alter table public.capacitacion_evaluations add constraint capacitacion_evaluations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.checklists add constraint checklists_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id);
alter table public.checklists add constraint checklists_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.designations add constraint designations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.designations add constraint designations_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;
alter table public.dispatch_checklist_items add constraint dispatch_checklist_items_checklist_id_fkey FOREIGN KEY (checklist_id) REFERENCES public.checklists(id) ON DELETE SET NULL;
alter table public.dispatch_checklist_items add constraint dispatch_checklist_items_dispatch_id_fkey FOREIGN KEY (dispatch_id) REFERENCES public.dispatches(id);
alter table public.dispatch_checklist_items add constraint dispatch_checklist_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.dispatches add constraint dispatches_aircraft_id_fkey FOREIGN KEY (aircraft_id) REFERENCES public.aircraft(id);
alter table public.dispatches add constraint dispatches_flight_id_fkey FOREIGN KEY (flight_id) REFERENCES public.flights(id);
alter table public.dispatches add constraint dispatches_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(id);
alter table public.dispatches add constraint dispatches_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.dispatches add constraint dispatches_pilot_person_id_fkey FOREIGN KEY (pilot_person_id) REFERENCES public.people(id);
alter table public.duty_exceptions add constraint duty_exceptions_duty_period_id_fkey FOREIGN KEY (duty_period_id) REFERENCES public.duty_periods(id) ON DELETE CASCADE;
alter table public.eta_items add constraint eta_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.eta_items add constraint eta_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.flights add constraint flights_aircraft_id_fkey FOREIGN KEY (aircraft_id) REFERENCES public.aircraft(id) ON DELETE SET NULL;
alter table public.flights add constraint flights_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(id);
alter table public.flights add constraint flights_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.flights add constraint flights_pilot_person_id_fkey FOREIGN KEY (pilot_person_id) REFERENCES public.people(id);
alter table public.flights add constraint flights_weather_observation_fk FOREIGN KEY (weather_observation_id) REFERENCES public.weather_observations(id) ON DELETE SET NULL;
alter table public.free_grants add constraint free_grants_advisor_member_id_fkey FOREIGN KEY (advisor_member_id) REFERENCES public.partner_members(id) ON DELETE SET NULL;
alter table public.free_grants add constraint free_grants_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE SET NULL;
alter table public.free_grants add constraint free_grants_redeemed_organization_id_fkey FOREIGN KEY (redeemed_organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
alter table public.hazards add constraint hazards_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id);
alter table public.hazards add constraint hazards_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.hazards add constraint hazards_related_barrier_fk FOREIGN KEY (related_barrier_id) REFERENCES public.barriers(id) ON DELETE SET NULL;
alter table public.insurance_policies add constraint insurance_policies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id);
alter table public.insurance_policies add constraint insurance_policies_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.insurance_policy_aircraft add constraint insurance_policy_aircraft_aircraft_id_fkey FOREIGN KEY (aircraft_id) REFERENCES public.aircraft(id) ON DELETE CASCADE;
alter table public.insurance_policy_aircraft add constraint insurance_policy_aircraft_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.insurance_policies(id) ON DELETE CASCADE;
alter table public.invitations add constraint invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.invitations add constraint invitations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.invitations add constraint invitations_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.legal_hold_events add constraint legal_hold_events_actor_person_id_fkey FOREIGN KEY (actor_person_id) REFERENCES public.people(id);
alter table public.legal_hold_events add constraint legal_hold_events_flight_id_fkey FOREIGN KEY (flight_id) REFERENCES public.flights(id) ON DELETE RESTRICT;
alter table public.legal_hold_events add constraint legal_hold_events_hold_id_fkey FOREIGN KEY (hold_id) REFERENCES public.legal_holds(id) ON DELETE CASCADE;
alter table public.legal_hold_flights add constraint legal_hold_flights_flight_id_fkey FOREIGN KEY (flight_id) REFERENCES public.flights(id) ON DELETE RESTRICT;
alter table public.legal_hold_flights add constraint legal_hold_flights_hold_id_fkey FOREIGN KEY (hold_id) REFERENCES public.legal_holds(id) ON DELETE CASCADE;
alter table public.legal_holds add constraint legal_holds_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES public.people(id);
alter table public.legal_holds add constraint legal_holds_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.legal_holds add constraint legal_holds_released_by_fkey FOREIGN KEY (released_by) REFERENCES public.people(id);
alter table public.legal_holds add constraint legal_holds_sms_case_id_fkey FOREIGN KEY (sms_case_id) REFERENCES public.sms_cases(id);
alter table public.maintenance_events add constraint maintenance_events_aircraft_id_fkey FOREIGN KEY (aircraft_id) REFERENCES public.aircraft(id) ON DELETE CASCADE;
alter table public.maintenance_events add constraint maintenance_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.maintenance_events add constraint maintenance_events_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.maintenance_events add constraint maintenance_events_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.maintenance_tasks(id) ON DELETE SET NULL;
alter table public.maintenance_programs add constraint maintenance_programs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.maintenance_programs add constraint maintenance_programs_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.aircraft_models(id) ON DELETE CASCADE;
alter table public.maintenance_programs add constraint maintenance_programs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.maintenance_tasks add constraint maintenance_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.maintenance_tasks add constraint maintenance_tasks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.maintenance_tasks add constraint maintenance_tasks_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.maintenance_programs(id) ON DELETE CASCADE;
alter table public.manual_acknowledgments add constraint manual_acknowledgments_manual_id_fkey FOREIGN KEY (manual_id) REFERENCES public.manuales(id) ON DELETE CASCADE;
alter table public.manual_acknowledgments add constraint manual_acknowledgments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.manual_acknowledgments add constraint manual_acknowledgments_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;
alter table public.manual_acknowledgments add constraint manual_acknowledgments_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.manual_versions(id) ON DELETE CASCADE;
alter table public.manual_versions add constraint manual_versions_manual_id_fkey FOREIGN KEY (manual_id) REFERENCES public.manuales(id) ON DELETE CASCADE;
alter table public.manual_versions add constraint manual_versions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.manual_versions add constraint manual_versions_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.manuales add constraint manuales_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.manuales add constraint manuales_current_version_id_fkey FOREIGN KEY (current_version_id) REFERENCES public.manual_versions(id) ON DELETE SET NULL;
alter table public.manuales add constraint manuales_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.memberships add constraint memberships_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.memberships add constraint memberships_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;
alter table public.missions add constraint missions_aircraft_id_fkey FOREIGN KEY (aircraft_id) REFERENCES public.aircraft(id) ON DELETE SET NULL;
alter table public.missions add constraint missions_observer_person_id_fkey FOREIGN KEY (observer_person_id) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.missions add constraint missions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.missions add constraint missions_pic_person_id_fkey FOREIGN KEY (pic_person_id) REFERENCES public.people(id);
alter table public.notifications add constraint notifications_actor_person_id_fkey FOREIGN KEY (actor_person_id) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.notifications add constraint notifications_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.notifications add constraint notifications_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;
alter table public.organization_certifications add constraint organization_certifications_dangerous_goods_declared_by_fkey FOREIGN KEY (dangerous_goods_declared_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.organization_certifications add constraint organization_certifications_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.organization_emergency_contacts add constraint organization_emergency_contacts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.organization_monthly_cycles add constraint organization_monthly_cycles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.organization_monthly_cycles add constraint organization_monthly_cycles_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.people(id);
alter table public.partner_codes add constraint partner_codes_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;
alter table public.partner_invitations add constraint partner_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.partner_invitations add constraint partner_invitations_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;
alter table public.partner_members add constraint partner_members_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;
alter table public.partner_members add constraint partner_members_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;
alter table public.partners add constraint partners_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.partners add constraint partners_parent_partner_id_fkey FOREIGN KEY (parent_partner_id) REFERENCES public.partners(id) ON DELETE SET NULL;
alter table public.pending_subscriptions add constraint pending_subscriptions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id);
alter table public.pending_subscriptions add constraint pending_subscriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.person_additions add constraint person_additions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.person_additions add constraint person_additions_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;
alter table public.person_documents add constraint person_documents_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;
alter table public.person_documents add constraint person_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.referral_commissions add constraint referral_commissions_referral_id_fkey FOREIGN KEY (referral_id) REFERENCES public.referrals(id) ON DELETE CASCADE;
alter table public.referrals add constraint referrals_advisor_member_id_fkey FOREIGN KEY (advisor_member_id) REFERENCES public.partner_members(id) ON DELETE SET NULL;
alter table public.referrals add constraint referrals_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.referrals add constraint referrals_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE SET NULL;
alter table public.risk_analyses add constraint risk_analyses_authorization_id_fkey FOREIGN KEY (authorization_id) REFERENCES public.authorization_requests(id) ON DELETE CASCADE;
alter table public.risk_analyses add constraint risk_analyses_signed_by_fkey FOREIGN KEY (signed_by) REFERENCES public.people(id);
alter table public.risk_assessments add constraint risk_assessments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id);
alter table public.risk_assessments add constraint risk_assessments_hazard_id_fkey FOREIGN KEY (hazard_id) REFERENCES public.hazards(id) ON DELETE CASCADE;
alter table public.risk_assessments add constraint risk_assessments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.risk_matrices add constraint risk_matrices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.risk_matrices add constraint risk_matrices_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.people(id);
alter table public.safety_indicator_action_plans add constraint safety_indicator_action_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id);
alter table public.safety_indicator_action_plans add constraint safety_indicator_action_plans_indicator_id_fkey FOREIGN KEY (indicator_id) REFERENCES public.safety_indicators(id) ON DELETE CASCADE;
alter table public.safety_indicator_action_plans add constraint safety_indicator_action_plans_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.safety_indicator_monthly add constraint safety_indicator_monthly_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id);
alter table public.safety_indicator_monthly add constraint safety_indicator_monthly_indicator_id_fkey FOREIGN KEY (indicator_id) REFERENCES public.safety_indicators(id) ON DELETE CASCADE;
alter table public.safety_indicator_monthly add constraint safety_indicator_monthly_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.safety_indicators add constraint safety_indicators_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id);
alter table public.safety_indicators add constraint safety_indicators_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.sms_case_actions add constraint sms_case_actions_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.sms_cases(id) ON DELETE CASCADE;
alter table public.sms_case_actions add constraint sms_case_actions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.sms_case_actions add constraint sms_case_actions_responsible_id_fkey FOREIGN KEY (responsible_id) REFERENCES public.people(id);
alter table public.sms_case_events add constraint sms_case_events_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.sms_cases(id) ON DELETE CASCADE;
alter table public.sms_case_events add constraint sms_case_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id);
alter table public.sms_case_events add constraint sms_case_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.sms_cases add constraint sms_cases_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.people(id);
alter table public.sms_cases add constraint sms_cases_hazard_id_fkey FOREIGN KEY (hazard_id) REFERENCES public.hazards(id);
alter table public.sms_cases add constraint sms_cases_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.sms_cases add constraint sms_cases_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.sms_reports(id) ON DELETE CASCADE;
alter table public.sms_changes add constraint sms_changes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.sms_changes add constraint sms_changes_hazard_id_fkey FOREIGN KEY (hazard_id) REFERENCES public.hazards(id) ON DELETE SET NULL;
alter table public.sms_changes add constraint sms_changes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.sms_changes add constraint sms_changes_responsible_id_fkey FOREIGN KEY (responsible_id) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.sms_gap_assessments add constraint sms_gap_assessments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.sms_gap_assessments add constraint sms_gap_assessments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.sms_gap_question_visibility add constraint sms_gap_question_visibility_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.sms_gap_question_visibility add constraint sms_gap_question_visibility_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.sms_gap_questions(id) ON DELETE CASCADE;
alter table public.sms_gap_questions add constraint sms_gap_questions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.sms_gap_questions add constraint sms_gap_questions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.sms_gap_responses add constraint sms_gap_responses_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.sms_gap_assessments(id) ON DELETE CASCADE;
alter table public.sms_gap_responses add constraint sms_gap_responses_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.sms_gap_responses add constraint sms_gap_responses_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.sms_gap_questions(id) ON DELETE CASCADE;
alter table public.sms_implementation_plan add constraint sms_implementation_plan_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.sms_implementation_plan add constraint sms_implementation_plan_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.sms_implementation_tasks add constraint sms_implementation_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.sms_implementation_tasks add constraint sms_implementation_tasks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.sms_implementation_tasks add constraint sms_implementation_tasks_responsible_person_id_fkey FOREIGN KEY (responsible_person_id) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.sms_monthly_reports add constraint sms_monthly_reports_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.sms_monthly_reports add constraint sms_monthly_reports_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.sms_objective_indicators add constraint sms_objective_indicators_indicator_id_fkey FOREIGN KEY (indicator_id) REFERENCES public.safety_indicators(id) ON DELETE CASCADE;
alter table public.sms_objective_indicators add constraint sms_objective_indicators_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.sms_objectives(id) ON DELETE CASCADE;
alter table public.sms_objectives add constraint sms_objectives_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.sms_objectives add constraint sms_objectives_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.sms_policies add constraint sms_policies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id);
alter table public.sms_policies add constraint sms_policies_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.sms_policies add constraint sms_policies_signed_by_fkey FOREIGN KEY (signed_by) REFERENCES public.people(id);
alter table public.sms_report_attachments add constraint sms_report_attachments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.sms_report_attachments add constraint sms_report_attachments_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.sms_reports(id) ON DELETE CASCADE;
alter table public.sms_report_attachments add constraint sms_report_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.people(id);
alter table public.sms_reports add constraint sms_reports_aircraft_id_fkey FOREIGN KEY (aircraft_id) REFERENCES public.aircraft(id);
alter table public.sms_reports add constraint sms_reports_analyzed_by_fkey FOREIGN KEY (analyzed_by) REFERENCES public.people(id);
alter table public.sms_reports add constraint sms_reports_flight_id_fkey FOREIGN KEY (flight_id) REFERENCES public.flights(id);
alter table public.sms_reports add constraint sms_reports_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.sms_reports add constraint sms_reports_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.people(id);
alter table public.sms_training_attendance add constraint sms_training_attendance_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.sms_training_attendance add constraint sms_training_attendance_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id);
alter table public.sms_training_attendance add constraint sms_training_attendance_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.people(id);
alter table public.sms_training_attendance add constraint sms_training_attendance_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sms_training_sessions(id) ON DELETE CASCADE;
alter table public.sms_training_sessions add constraint sms_training_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id);
alter table public.sms_training_sessions add constraint sms_training_sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.subscriptions add constraint subscriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.subscriptions add constraint subscriptions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.people(id);
alter table public.supplier_audit_criteria add constraint supplier_audit_criteria_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.supplier_audits add constraint supplier_audits_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id);
alter table public.supplier_audits add constraint supplier_audits_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.supplier_audits add constraint supplier_audits_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;
alter table public.suppliers add constraint suppliers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id);
alter table public.suppliers add constraint suppliers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.training_exam_attempts add constraint training_exam_attempts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.training_exam_attempts add constraint training_exam_attempts_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id);
alter table public.training_exam_questions add constraint training_exam_questions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id);
alter table public.training_exam_questions add constraint training_exam_questions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.training_exams add constraint training_exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id);
alter table public.training_exams add constraint training_exams_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.unexpected_events add constraint unexpected_events_aircraft_id_fkey FOREIGN KEY (aircraft_id) REFERENCES public.aircraft(id) ON DELETE CASCADE;
alter table public.unexpected_events add constraint unexpected_events_evaluated_by_fkey FOREIGN KEY (evaluated_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.unexpected_events add constraint unexpected_events_flight_id_fkey FOREIGN KEY (flight_id) REFERENCES public.flights(id) ON DELETE SET NULL;
alter table public.unexpected_events add constraint unexpected_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
alter table public.unexpected_events add constraint unexpected_events_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.people(id) ON DELETE SET NULL;
alter table public.weather_observations add constraint weather_observations_dispatch_id_fkey FOREIGN KEY (dispatch_id) REFERENCES public.dispatches(id) ON DELETE SET NULL;
alter table public.weather_observations add constraint weather_observations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ============ Índices ============
CREATE INDEX accounts_person_idx ON public.accounts USING btree (person_id);
CREATE INDEX aircraft_components_aircraft_id_idx ON public.aircraft_components USING btree (aircraft_id);
CREATE INDEX aircraft_components_organization_id_idx ON public.aircraft_components USING btree (organization_id);
CREATE INDEX aircraft_model_id_idx ON public.aircraft USING btree (model_id);
CREATE INDEX aircraft_models_organization_id_idx ON public.aircraft_models USING btree (organization_id);
CREATE INDEX aircraft_organization_id_idx ON public.aircraft USING btree (organization_id);
CREATE INDEX authorization_requests_org_idx ON public.authorization_requests USING btree (organization_id);
CREATE INDEX barriers_org_idx ON public.barriers USING btree (organization_id);
CREATE INDEX batteries_organization_id_idx ON public.batteries USING btree (organization_id);
CREATE INDEX c2_events_org_created_idx ON public.c2_events USING btree (organization_id, created_at DESC);
CREATE INDEX c2_sessions_org_status_idx ON public.c2_sessions USING btree (organization_id, status);
CREATE INDEX c2_telemetry_session_recorded_idx ON public.c2_telemetry USING btree (session_id, recorded_at DESC);
CREATE INDEX capacitacion_evaluation_attempts_person_idx ON public.capacitacion_evaluation_attempts USING btree (evaluation_id, person_id);
CREATE INDEX capacitacion_evaluation_questions_eval_idx ON public.capacitacion_evaluation_questions USING btree (evaluation_id, order_index);
CREATE INDEX capacitacion_evaluations_org_type_idx ON public.capacitacion_evaluations USING btree (organization_id, type, due_date);
CREATE INDEX checklists_org_category_idx ON public.checklists USING btree (organization_id, category);
CREATE INDEX designations_org_idx ON public.designations USING btree (organization_id);
CREATE INDEX designations_person_idx ON public.designations USING btree (person_id);
CREATE INDEX dispatch_items_dispatch_idx ON public.dispatch_checklist_items USING btree (dispatch_id);
CREATE INDEX dispatch_items_no_idx ON public.dispatch_checklist_items USING btree (organization_id, checklist_id) WHERE (value = 'no'::text);
CREATE INDEX dispatches_org_date_idx ON public.dispatches USING btree (organization_id, dispatched_at DESC);
CREATE INDEX dispatches_pilot_idx ON public.dispatches USING btree (pilot_person_id, dispatched_at DESC);
CREATE INDEX duty_exceptions_period_idx ON public.duty_exceptions USING btree (duty_period_id);
CREATE INDEX duty_periods_org_idx ON public.duty_periods USING btree (organization_id);
CREATE INDEX duty_periods_person_started_idx ON public.duty_periods USING btree (person_id, started_at);
CREATE INDEX eta_items_organization_id_idx ON public.eta_items USING btree (organization_id);
CREATE UNIQUE INDEX flights_mission_id_unique ON public.flights USING btree (mission_id) WHERE (mission_id IS NOT NULL);
CREATE INDEX flights_org_idx ON public.flights USING btree (organization_id);
CREATE INDEX flights_pilot_takeoff_idx ON public.flights USING btree (pilot_person_id, takeoff_at);
CREATE INDEX free_grants_partner_idx ON public.free_grants USING btree (partner_id);
CREATE INDEX hazards_org_idx ON public.hazards USING btree (organization_id);
CREATE INDEX insurance_policies_org_end_idx ON public.insurance_policies USING btree (organization_id, end_date);
CREATE INDEX insurance_policy_aircraft_aircraft_idx ON public.insurance_policy_aircraft USING btree (aircraft_id);
CREATE INDEX invitations_org_idx ON public.invitations USING btree (organization_id, created_at DESC);
CREATE UNIQUE INDEX invitations_pending_uidx ON public.invitations USING btree (organization_id, lower(email)) WHERE (status = 'pendiente'::text);
CREATE INDEX legal_hold_events_hold_idx ON public.legal_hold_events USING btree (hold_id, created_at);
CREATE INDEX legal_hold_flights_flight_idx ON public.legal_hold_flights USING btree (flight_id);
CREATE INDEX legal_holds_org_idx ON public.legal_holds USING btree (organization_id, opened_at DESC);
CREATE INDEX maintenance_events_aircraft_task_idx ON public.maintenance_events USING btree (aircraft_id, task_id);
CREATE INDEX maintenance_events_organization_id_idx ON public.maintenance_events USING btree (organization_id);
CREATE INDEX maintenance_programs_organization_id_idx ON public.maintenance_programs USING btree (organization_id);
CREATE INDEX maintenance_tasks_organization_id_idx ON public.maintenance_tasks USING btree (organization_id);
CREATE INDEX maintenance_tasks_program_id_idx ON public.maintenance_tasks USING btree (program_id);
CREATE INDEX manual_acknowledgments_manual_id_idx ON public.manual_acknowledgments USING btree (manual_id);
CREATE INDEX manual_versions_manual_id_idx ON public.manual_versions USING btree (manual_id);
CREATE INDEX manuales_organization_id_idx ON public.manuales USING btree (organization_id);
CREATE UNIQUE INDEX memberships_active_person_org_idx ON public.memberships USING btree (person_id, organization_id) WHERE (status = 'activa'::text);
CREATE INDEX memberships_org_idx ON public.memberships USING btree (organization_id);
CREATE INDEX memberships_person_idx ON public.memberships USING btree (person_id);
CREATE UNIQUE INDEX memberships_person_org_active_uidx ON public.memberships USING btree (person_id, organization_id) WHERE (status = 'activa'::text);
CREATE INDEX missions_org_scheduled_idx ON public.missions USING btree (organization_id, scheduled_at);
CREATE INDEX missions_pic_scheduled_idx ON public.missions USING btree (pic_person_id, scheduled_at);
CREATE INDEX notifications_actor_idx ON public.notifications USING btree (actor_person_id);
CREATE UNIQUE INDEX notifications_dedupe_uidx ON public.notifications USING btree (person_id, dedupe_key) WHERE (dedupe_key IS NOT NULL);
CREATE INDEX notifications_org_idx ON public.notifications USING btree (organization_id);
CREATE INDEX notifications_person_idx ON public.notifications USING btree (person_id, created_at DESC);
CREATE INDEX notifications_person_unread_idx ON public.notifications USING btree (person_id) WHERE (read_at IS NULL);
CREATE INDEX organization_certifications_org_idx ON public.organization_certifications USING btree (organization_id);
CREATE UNIQUE INDEX organizations_nit_normalized_uidx ON public.organizations USING btree (upper(regexp_replace(nit, '[\s\-.]'::text, ''::text, 'g'::text))) WHERE ((nit IS NOT NULL) AND (nit <> ''::text));
CREATE INDEX partner_codes_partner_idx ON public.partner_codes USING btree (partner_id);
CREATE INDEX partner_invitations_partner_idx ON public.partner_invitations USING btree (partner_id);
CREATE INDEX partner_members_person_idx ON public.partner_members USING btree (person_id);
CREATE INDEX referral_commissions_referral_idx ON public.referral_commissions USING btree (referral_id);
CREATE INDEX referrals_partner_idx ON public.referrals USING btree (partner_id);
CREATE UNIQUE INDEX risk_analyses_authorization_uidx ON public.risk_analyses USING btree (authorization_id);
CREATE INDEX risk_assessments_hazard_idx ON public.risk_assessments USING btree (hazard_id);
CREATE INDEX risk_assessments_org_idx ON public.risk_assessments USING btree (organization_id);
CREATE INDEX safety_indicator_action_plans_indicator_idx ON public.safety_indicator_action_plans USING btree (indicator_id);
CREATE INDEX safety_indicator_monthly_indicator_idx ON public.safety_indicator_monthly USING btree (indicator_id);
CREATE INDEX safety_indicator_monthly_org_idx ON public.safety_indicator_monthly USING btree (organization_id);
CREATE INDEX safety_indicators_org_idx ON public.safety_indicators USING btree (organization_id);
CREATE INDEX sms_case_actions_case_idx ON public.sms_case_actions USING btree (case_id);
CREATE INDEX sms_case_events_case_idx ON public.sms_case_events USING btree (case_id);
CREATE INDEX sms_cases_org_idx ON public.sms_cases USING btree (organization_id);
CREATE INDEX sms_changes_org_idx ON public.sms_changes USING btree (organization_id, created_at DESC);
CREATE INDEX sms_gap_assessments_org_idx ON public.sms_gap_assessments USING btree (organization_id);
CREATE INDEX sms_gap_questions_org_idx ON public.sms_gap_questions USING btree (organization_id);
CREATE INDEX sms_gap_responses_assessment_idx ON public.sms_gap_responses USING btree (assessment_id);
CREATE UNIQUE INDEX sms_implementation_tasks_org_element_idx ON public.sms_implementation_tasks USING btree (organization_id, element_key) WHERE (element_key IS NOT NULL);
CREATE INDEX sms_implementation_tasks_org_idx ON public.sms_implementation_tasks USING btree (organization_id);
CREATE INDEX sms_monthly_reports_org_idx ON public.sms_monthly_reports USING btree (organization_id);
CREATE INDEX sms_objective_indicators_objective_idx ON public.sms_objective_indicators USING btree (objective_id);
CREATE INDEX sms_objectives_org_idx ON public.sms_objectives USING btree (organization_id);
CREATE INDEX sms_policies_org_idx ON public.sms_policies USING btree (organization_id);
CREATE INDEX sms_report_attachments_report_idx ON public.sms_report_attachments USING btree (report_id);
CREATE INDEX sms_reports_flight_idx ON public.sms_reports USING btree (flight_id) WHERE (flight_id IS NOT NULL);
CREATE INDEX sms_reports_org_idx ON public.sms_reports USING btree (organization_id);
CREATE INDEX sms_reports_org_occurred_idx ON public.sms_reports USING btree (organization_id, occurred_at DESC);
CREATE INDEX sms_training_attendance_org_idx ON public.sms_training_attendance USING btree (organization_id);
CREATE INDEX sms_training_attendance_session_idx ON public.sms_training_attendance USING btree (session_id);
CREATE INDEX sms_training_sessions_org_idx ON public.sms_training_sessions USING btree (organization_id);
CREATE INDEX supplier_audit_criteria_org_idx ON public.supplier_audit_criteria USING btree (organization_id, order_index);
CREATE INDEX supplier_audits_supplier_idx ON public.supplier_audits USING btree (supplier_id, audit_date);
CREATE INDEX suppliers_org_idx ON public.suppliers USING btree (organization_id);
CREATE INDEX training_exam_attempts_org_idx ON public.training_exam_attempts USING btree (organization_id);
CREATE INDEX training_exam_attempts_person_idx ON public.training_exam_attempts USING btree (person_id);
CREATE INDEX training_exam_questions_org_idx ON public.training_exam_questions USING btree (organization_id);
CREATE INDEX unexpected_events_aircraft_id_idx ON public.unexpected_events USING btree (aircraft_id);
CREATE INDEX unexpected_events_organization_id_idx ON public.unexpected_events USING btree (organization_id);
CREATE INDEX weather_observations_org_idx ON public.weather_observations USING btree (organization_id, observed_at DESC);

-- ============ Disparadores ============
CREATE TRIGGER authorization_requests_retention BEFORE DELETE ON public.authorization_requests FOR EACH ROW EXECUTE FUNCTION public.v2_enforce_retention('created_at');
CREATE TRIGGER dispatch_checklist_items_retention BEFORE DELETE ON public.dispatch_checklist_items FOR EACH ROW EXECUTE FUNCTION public.v2_enforce_retention('created_at');
CREATE TRIGGER dispatch_items_no_update BEFORE UPDATE ON public.dispatch_checklist_items FOR EACH ROW EXECUTE FUNCTION public.v2_dispatch_items_immutable();
CREATE TRIGGER dispatches_close_only BEFORE UPDATE ON public.dispatches FOR EACH ROW EXECUTE FUNCTION public.v2_dispatch_close_only();
CREATE TRIGGER dispatches_retention BEFORE DELETE ON public.dispatches FOR EACH ROW EXECUTE FUNCTION public.v2_enforce_retention('dispatched_at');
CREATE TRIGGER duty_annual_certifications_retention BEFORE DELETE ON public.duty_annual_certifications FOR EACH ROW EXECUTE FUNCTION public.v2_enforce_retention('certified_at');
CREATE TRIGGER duty_exceptions_retention BEFORE DELETE ON public.duty_exceptions FOR EACH ROW EXECUTE FUNCTION public.v2_enforce_retention('created_at');
CREATE TRIGGER duty_periods_retention BEFORE DELETE ON public.duty_periods FOR EACH ROW EXECUTE FUNCTION public.v2_enforce_retention('started_at');
CREATE TRIGGER flights_replay_hold_guard BEFORE UPDATE OF replay_track, replay_path ON public.flights FOR EACH ROW EXECUTE FUNCTION public.v2_flight_replay_hold_guard();
CREATE TRIGGER flights_retention BEFORE DELETE ON public.flights FOR EACH ROW EXECUTE FUNCTION public.v2_enforce_retention('takeoff_at');
CREATE TRIGGER free_grants_touch BEFORE UPDATE ON public.free_grants FOR EACH ROW EXECUTE FUNCTION public.v2_touch_updated_at();
CREATE TRIGGER legal_hold_events_no_delete BEFORE DELETE ON public.legal_hold_events FOR EACH ROW EXECUTE FUNCTION public.v2_legal_hold_immutable();
CREATE TRIGGER legal_hold_events_no_update BEFORE UPDATE ON public.legal_hold_events FOR EACH ROW EXECUTE FUNCTION public.v2_legal_hold_immutable();
CREATE TRIGGER legal_hold_flights_no_delete BEFORE DELETE ON public.legal_hold_flights FOR EACH ROW EXECUTE FUNCTION public.v2_legal_hold_immutable();
CREATE TRIGGER legal_hold_flights_no_update BEFORE UPDATE ON public.legal_hold_flights FOR EACH ROW EXECUTE FUNCTION public.v2_legal_hold_immutable();
CREATE TRIGGER legal_holds_no_delete BEFORE DELETE ON public.legal_holds FOR EACH ROW EXECUTE FUNCTION public.v2_legal_hold_immutable();
CREATE TRIGGER legal_holds_release_only BEFORE UPDATE ON public.legal_holds FOR EACH ROW EXECUTE FUNCTION public.v2_legal_hold_release_only();
CREATE TRIGGER maintenance_events_retention BEFORE DELETE ON public.maintenance_events FOR EACH ROW EXECUTE FUNCTION public.v2_enforce_retention('performed_at');
CREATE TRIGGER missions_lifecycle_guard BEFORE UPDATE ON public.missions FOR EACH ROW EXECUTE FUNCTION public.v2_missions_lifecycle_guard();
CREATE TRIGGER missions_retention BEFORE DELETE ON public.missions FOR EACH ROW EXECUTE FUNCTION public.v2_enforce_retention('scheduled_at');
CREATE TRIGGER referral_commissions_touch BEFORE UPDATE ON public.referral_commissions FOR EACH ROW EXECUTE FUNCTION public.v2_touch_updated_at();
CREATE TRIGGER risk_analyses_retention BEFORE DELETE ON public.risk_analyses FOR EACH ROW EXECUTE FUNCTION public.v2_enforce_retention('created_at');
CREATE TRIGGER sms_case_actions_retention BEFORE DELETE ON public.sms_case_actions FOR EACH ROW EXECUTE FUNCTION public.v2_enforce_retention('created_at');
CREATE TRIGGER sms_case_events_retention BEFORE DELETE ON public.sms_case_events FOR EACH ROW EXECUTE FUNCTION public.v2_enforce_retention('created_at');
CREATE TRIGGER sms_cases_retention BEFORE DELETE ON public.sms_cases FOR EACH ROW EXECUTE FUNCTION public.v2_enforce_retention('created_at');
CREATE TRIGGER sms_changes_retention BEFORE DELETE ON public.sms_changes FOR EACH ROW EXECUTE FUNCTION public.v2_enforce_retention('created_at');
CREATE TRIGGER sms_changes_updated_at BEFORE UPDATE ON public.sms_changes FOR EACH ROW EXECUTE FUNCTION public.v2_touch_updated_at();
CREATE TRIGGER sms_monthly_reports_retention BEFORE DELETE ON public.sms_monthly_reports FOR EACH ROW EXECUTE FUNCTION public.v2_enforce_retention('created_at');
CREATE TRIGGER sms_report_attachments_retention BEFORE DELETE ON public.sms_report_attachments FOR EACH ROW EXECUTE FUNCTION public.v2_enforce_retention('created_at');
CREATE TRIGGER sms_reports_retention BEFORE DELETE ON public.sms_reports FOR EACH ROW EXECUTE FUNCTION public.v2_enforce_retention('created_at');
CREATE TRIGGER unexpected_events_retention BEFORE DELETE ON public.unexpected_events FOR EACH ROW EXECUTE FUNCTION public.v2_enforce_retention('reported_at');
CREATE TRIGGER weather_observations_retention BEFORE DELETE ON public.weather_observations FOR EACH ROW EXECUTE FUNCTION public.v2_enforce_retention('observed_at');

-- ============ Seguridad por filas (RLS) e identidad de réplica ============
alter table public.accounts enable row level security;
alter table public.aircraft enable row level security;
alter table public.aircraft_components enable row level security;
alter table public.aircraft_models enable row level security;
alter table public.app_releases enable row level security;
alter table public.authorization_requests enable row level security;
alter table public.barriers enable row level security;
alter table public.batteries enable row level security;
alter table public.c2_events enable row level security;
alter table public.c2_sessions enable row level security;
alter table public.c2_telemetry enable row level security;
alter table public.capacitacion_evaluation_attempts enable row level security;
alter table public.capacitacion_evaluation_questions enable row level security;
alter table public.capacitacion_evaluations enable row level security;
alter table public.checklists enable row level security;
alter table public.colombia_geo enable row level security;
alter table public.designations enable row level security;
alter table public.dispatch_checklist_items enable row level security;
alter table public.dispatches enable row level security;
alter table public.duty_annual_certifications enable row level security;
alter table public.duty_exceptions enable row level security;
alter table public.duty_periods enable row level security;
alter table public.eta_items enable row level security;
alter table public.etl_id_map enable row level security;
alter table public.flights enable row level security;
alter table public.free_grants enable row level security;
alter table public.hazards enable row level security;
alter table public.insurance_policies enable row level security;
alter table public.insurance_policy_aircraft enable row level security;
alter table public.invitations enable row level security;
alter table public.legacy_v1_rows enable row level security;
alter table public.legal_hold_events enable row level security;
alter table public.legal_hold_flights enable row level security;
alter table public.legal_holds enable row level security;
alter table public.maintenance_events enable row level security;
alter table public.maintenance_programs enable row level security;
alter table public.maintenance_tasks enable row level security;
alter table public.manual_acknowledgments enable row level security;
alter table public.manual_versions enable row level security;
alter table public.manuales enable row level security;
alter table public.memberships enable row level security;
alter table public.missions enable row level security;
alter table public.notifications enable row level security;
alter table public.organization_certifications enable row level security;
alter table public.organization_emergency_contacts enable row level security;
alter table public.organization_monthly_cycles enable row level security;
alter table public.organizations enable row level security;
alter table public.partner_codes enable row level security;
alter table public.partner_invitations enable row level security;
alter table public.partner_members enable row level security;
alter table public.partners enable row level security;
alter table public.pending_subscriptions enable row level security;
alter table public.people enable row level security;
alter table public.person_additions enable row level security;
alter table public.person_documents enable row level security;
alter table public.referral_commissions enable row level security;
alter table public.referrals enable row level security;
alter table public.risk_analyses enable row level security;
alter table public.risk_assessments enable row level security;
alter table public.risk_matrices enable row level security;
alter table public.safety_indicator_action_plans enable row level security;
alter table public.safety_indicator_monthly enable row level security;
alter table public.safety_indicators enable row level security;
alter table public.sms_case_actions enable row level security;
alter table public.sms_case_events enable row level security;
alter table public.sms_cases enable row level security;
alter table public.sms_changes enable row level security;
alter table public.sms_gap_assessments enable row level security;
alter table public.sms_gap_question_visibility enable row level security;
alter table public.sms_gap_questions enable row level security;
alter table public.sms_gap_responses enable row level security;
alter table public.sms_implementation_plan enable row level security;
alter table public.sms_implementation_tasks enable row level security;
alter table public.sms_monthly_reports enable row level security;
alter table public.sms_objective_indicators enable row level security;
alter table public.sms_objectives enable row level security;
alter table public.sms_policies enable row level security;
alter table public.sms_report_attachments enable row level security;
alter table public.sms_reports enable row level security;
alter table public.sms_training_attendance enable row level security;
alter table public.sms_training_sessions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.supplier_audit_criteria enable row level security;
alter table public.supplier_audits enable row level security;
alter table public.suppliers enable row level security;
alter table public.training_exam_attempts enable row level security;
alter table public.training_exam_questions enable row level security;
alter table public.training_exams enable row level security;
alter table public.unexpected_events enable row level security;
alter table public.weather_observations enable row level security;
alter table public.wompi_processed_refs enable row level security;

-- ============ Políticas RLS ============
create policy accounts_select_own on public.accounts as permissive for select to public using ((auth_user_id = auth.uid()));
create policy aircraft_delete on public.aircraft as permissive for delete to public using (public.v2_is_duty_manager(organization_id));
create policy aircraft_insert on public.aircraft as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy aircraft_select on public.aircraft as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy aircraft_update on public.aircraft as permissive for update to public using (public.v2_is_duty_manager(organization_id));
create policy aircraft_components_delete on public.aircraft_components as permissive for delete to public using (public.v2_is_duty_manager(organization_id));
create policy aircraft_components_insert on public.aircraft_components as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy aircraft_components_select on public.aircraft_components as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy aircraft_components_update on public.aircraft_components as permissive for update to public using (public.v2_is_duty_manager(organization_id));
create policy aircraft_models_delete on public.aircraft_models as permissive for delete to public using (public.v2_is_duty_manager(organization_id));
create policy aircraft_models_insert on public.aircraft_models as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy aircraft_models_select on public.aircraft_models as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy aircraft_models_update on public.aircraft_models as permissive for update to public using (public.v2_is_duty_manager(organization_id));
create policy public_read_current_version on public.app_releases as permissive for select to public using ((is_current = true));
create policy authorization_requests_insert on public.authorization_requests as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy authorization_requests_select on public.authorization_requests as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy authorization_requests_update on public.authorization_requests as permissive for update to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy barriers_insert on public.barriers as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy barriers_select on public.barriers as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy batteries_delete on public.batteries as permissive for delete to public using (public.v2_is_duty_manager(organization_id));
create policy batteries_insert on public.batteries as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy batteries_select on public.batteries as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy batteries_update on public.batteries as permissive for update to public using (public.v2_is_duty_manager(organization_id));
create policy c2_events_select on public.c2_events as permissive for select to public using ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.organization_id = c2_events.organization_id) AND (m.person_id = public.v2_current_person_id()) AND (m.status = 'activa'::text)))));
create policy c2_sessions_select on public.c2_sessions as permissive for select to public using ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.organization_id = c2_sessions.organization_id) AND (m.person_id = public.v2_current_person_id()) AND (m.status = 'activa'::text)))));
create policy c2_telemetry_select on public.c2_telemetry as permissive for select to public using ((EXISTS ( SELECT 1
   FROM (public.c2_sessions s
     JOIN public.memberships m ON ((m.organization_id = s.organization_id)))
  WHERE ((s.id = c2_telemetry.session_id) AND (m.person_id = public.v2_current_person_id()) AND (m.status = 'activa'::text)))));
create policy capacitacion_evaluation_attempts_insert on public.capacitacion_evaluation_attempts as permissive for insert to public with check (((person_id = public.v2_current_person_id()) AND (organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids))));
create policy capacitacion_evaluation_attempts_select on public.capacitacion_evaluation_attempts as permissive for select to public using (((person_id = public.v2_current_person_id()) OR public.v2_is_duty_manager(organization_id)));
create policy capacitacion_evaluation_questions_delete on public.capacitacion_evaluation_questions as permissive for delete to public using ((EXISTS ( SELECT 1
   FROM public.capacitacion_evaluations e
  WHERE ((e.id = capacitacion_evaluation_questions.evaluation_id) AND public.v2_is_duty_manager(e.organization_id)))));
create policy capacitacion_evaluation_questions_insert on public.capacitacion_evaluation_questions as permissive for insert to public with check ((EXISTS ( SELECT 1
   FROM public.capacitacion_evaluations e
  WHERE ((e.id = capacitacion_evaluation_questions.evaluation_id) AND public.v2_is_duty_manager(e.organization_id)))));
create policy capacitacion_evaluation_questions_select on public.capacitacion_evaluation_questions as permissive for select to public using ((EXISTS ( SELECT 1
   FROM public.capacitacion_evaluations e
  WHERE ((e.id = capacitacion_evaluation_questions.evaluation_id) AND public.v2_is_duty_manager(e.organization_id)))));
create policy capacitacion_evaluations_delete on public.capacitacion_evaluations as permissive for delete to public using (public.v2_is_duty_manager(organization_id));
create policy capacitacion_evaluations_insert on public.capacitacion_evaluations as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy capacitacion_evaluations_select on public.capacitacion_evaluations as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy capacitacion_evaluations_update on public.capacitacion_evaluations as permissive for update to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy checklists_delete on public.checklists as permissive for delete to public using (public.v2_is_duty_manager(organization_id));
create policy checklists_insert on public.checklists as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy checklists_select on public.checklists as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy checklists_update on public.checklists as permissive for update to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy colombia_geo_select on public.colombia_geo as permissive for select to public using ((auth.uid() IS NOT NULL));
create policy designations_insert on public.designations as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy designations_select_orgmates on public.designations as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy designations_update on public.designations as permissive for update to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy dispatch_items_select on public.dispatch_checklist_items as permissive for select to public using ((EXISTS ( SELECT 1
   FROM public.dispatches d
  WHERE ((d.id = dispatch_checklist_items.dispatch_id) AND ((d.pilot_person_id = public.v2_current_person_id()) OR public.v2_is_duty_manager(d.organization_id))))));
create policy dispatches_select on public.dispatches as permissive for select to public using (((pilot_person_id = public.v2_current_person_id()) OR public.v2_is_duty_manager(organization_id)));
create policy duty_annual_certifications_insert on public.duty_annual_certifications as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy duty_annual_certifications_select on public.duty_annual_certifications as permissive for select to public using (((person_id = public.v2_current_person_id()) OR public.v2_is_duty_manager(organization_id)));
create policy duty_exceptions_insert on public.duty_exceptions as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy duty_exceptions_select on public.duty_exceptions as permissive for select to public using ((public.v2_is_duty_manager(organization_id) OR (duty_period_id IN ( SELECT duty_periods.id
   FROM public.duty_periods
  WHERE (duty_periods.person_id = public.v2_current_person_id())))));
create policy duty_periods_insert on public.duty_periods as permissive for insert to public with check (((person_id = public.v2_current_person_id()) OR public.v2_is_duty_manager(organization_id)));
create policy duty_periods_select on public.duty_periods as permissive for select to public using (((person_id = public.v2_current_person_id()) OR public.v2_is_duty_manager(organization_id)));
create policy duty_periods_update_close_only on public.duty_periods as permissive for update to public using (((ended_at IS NULL) AND ((person_id = public.v2_current_person_id()) OR public.v2_is_duty_manager(organization_id)))) with check (((person_id = public.v2_current_person_id()) OR public.v2_is_duty_manager(organization_id)));
create policy eta_items_delete on public.eta_items as permissive for delete to public using (public.v2_is_duty_manager(organization_id));
create policy eta_items_insert on public.eta_items as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy eta_items_select on public.eta_items as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy eta_items_update on public.eta_items as permissive for update to public using (public.v2_is_duty_manager(organization_id));
create policy flights_insert on public.flights as permissive for insert to public with check (((pilot_person_id = public.v2_current_person_id()) OR public.v2_is_duty_manager(organization_id)));
create policy flights_select on public.flights as permissive for select to public using (((pilot_person_id = public.v2_current_person_id()) OR public.v2_is_duty_manager(organization_id)));
create policy free_grants_member_read on public.free_grants as permissive for select to authenticated using ((partner_id IN ( SELECT public.v2_my_partner_ids() AS v2_my_partner_ids)));
create policy hazards_insert on public.hazards as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy hazards_select on public.hazards as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy insurance_policies_delete on public.insurance_policies as permissive for delete to public using (public.v2_is_duty_manager(organization_id));
create policy insurance_policies_insert on public.insurance_policies as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy insurance_policies_select on public.insurance_policies as permissive for select to public using (public.v2_is_duty_manager(organization_id));
create policy insurance_policies_update on public.insurance_policies as permissive for update to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy insurance_policy_aircraft_delete on public.insurance_policy_aircraft as permissive for delete to public using ((EXISTS ( SELECT 1
   FROM public.insurance_policies p
  WHERE ((p.id = insurance_policy_aircraft.policy_id) AND public.v2_is_duty_manager(p.organization_id)))));
create policy insurance_policy_aircraft_insert on public.insurance_policy_aircraft as permissive for insert to public with check ((EXISTS ( SELECT 1
   FROM (public.insurance_policies p
     JOIN public.aircraft a ON ((a.id = insurance_policy_aircraft.aircraft_id)))
  WHERE ((p.id = insurance_policy_aircraft.policy_id) AND (a.organization_id = p.organization_id) AND public.v2_is_duty_manager(p.organization_id)))));
create policy insurance_policy_aircraft_select on public.insurance_policy_aircraft as permissive for select to public using ((EXISTS ( SELECT 1
   FROM public.insurance_policies p
  WHERE ((p.id = insurance_policy_aircraft.policy_id) AND public.v2_is_duty_manager(p.organization_id)))));
create policy invitations_select_managers on public.invitations as permissive for select to public using (public.v2_is_duty_manager(organization_id));
create policy legal_hold_events_select on public.legal_hold_events as permissive for select to public using ((EXISTS ( SELECT 1
   FROM public.legal_holds h
  WHERE ((h.id = legal_hold_events.hold_id) AND public.v2_is_duty_manager(h.organization_id)))));
create policy legal_hold_flights_insert on public.legal_hold_flights as permissive for insert to public with check ((EXISTS ( SELECT 1
   FROM (public.legal_holds h
     JOIN public.flights f ON ((f.id = legal_hold_flights.flight_id)))
  WHERE ((h.id = legal_hold_flights.hold_id) AND (h.released_at IS NULL) AND (f.organization_id = h.organization_id) AND public.v2_is_duty_manager(h.organization_id)))));
create policy legal_hold_flights_select on public.legal_hold_flights as permissive for select to public using ((EXISTS ( SELECT 1
   FROM public.legal_holds h
  WHERE ((h.id = legal_hold_flights.hold_id) AND public.v2_is_duty_manager(h.organization_id)))));
create policy legal_holds_insert on public.legal_holds as permissive for insert to public with check ((public.v2_is_duty_manager(organization_id) AND (opened_by = public.v2_current_person_id()) AND (released_at IS NULL)));
create policy legal_holds_release on public.legal_holds as permissive for update to public using (public.v2_is_org_authority(organization_id)) with check (public.v2_is_org_authority(organization_id));
create policy legal_holds_select on public.legal_holds as permissive for select to public using (public.v2_is_duty_manager(organization_id));
create policy maintenance_events_insert on public.maintenance_events as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy maintenance_events_select on public.maintenance_events as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy maintenance_programs_delete on public.maintenance_programs as permissive for delete to public using (public.v2_is_duty_manager(organization_id));
create policy maintenance_programs_insert on public.maintenance_programs as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy maintenance_programs_select on public.maintenance_programs as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy maintenance_programs_update on public.maintenance_programs as permissive for update to public using (public.v2_is_duty_manager(organization_id));
create policy maintenance_tasks_delete on public.maintenance_tasks as permissive for delete to public using (public.v2_is_duty_manager(organization_id));
create policy maintenance_tasks_insert on public.maintenance_tasks as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy maintenance_tasks_select on public.maintenance_tasks as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy maintenance_tasks_update on public.maintenance_tasks as permissive for update to public using (public.v2_is_duty_manager(organization_id));
create policy manual_acknowledgments_delete on public.manual_acknowledgments as permissive for delete to public using ((person_id = public.v2_current_person_id()));
create policy manual_acknowledgments_insert on public.manual_acknowledgments as permissive for insert to public with check (((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)) AND (person_id = public.v2_current_person_id())));
create policy manual_acknowledgments_select on public.manual_acknowledgments as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy manual_versions_delete on public.manual_versions as permissive for delete to public using (public.v2_is_duty_manager(organization_id));
create policy manual_versions_insert on public.manual_versions as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy manual_versions_select on public.manual_versions as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy manuales_delete on public.manuales as permissive for delete to public using (public.v2_is_duty_manager(organization_id));
create policy manuales_insert on public.manuales as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy manuales_select on public.manuales as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy manuales_update on public.manuales as permissive for update to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy memberships_select_orgmates on public.memberships as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy missions_insert on public.missions as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy missions_select on public.missions as permissive for select to public using (((pic_person_id = public.v2_current_person_id()) OR (observer_person_id = public.v2_current_person_id()) OR public.v2_is_duty_manager(organization_id)));
create policy missions_update on public.missions as permissive for update to public using (public.v2_is_duty_manager(organization_id));
create policy notifications_delete_own on public.notifications as permissive for delete to authenticated using ((person_id = ( SELECT public.v2_current_person_id() AS v2_current_person_id)));
create policy notifications_select_own on public.notifications as permissive for select to authenticated using ((person_id = ( SELECT public.v2_current_person_id() AS v2_current_person_id)));
create policy notifications_update_own on public.notifications as permissive for update to authenticated using ((person_id = ( SELECT public.v2_current_person_id() AS v2_current_person_id))) with check ((person_id = ( SELECT public.v2_current_person_id() AS v2_current_person_id)));
create policy organization_certifications_select_orgmates on public.organization_certifications as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy org_emergency_contacts_select on public.organization_emergency_contacts as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy org_emergency_contacts_write on public.organization_emergency_contacts as permissive for all to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy organization_monthly_cycles_select on public.organization_monthly_cycles as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy organization_monthly_cycles_update on public.organization_monthly_cycles as permissive for update to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy organization_monthly_cycles_upsert on public.organization_monthly_cycles as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy organizations_select_members on public.organizations as permissive for select to public using ((id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy partner_codes_member_read on public.partner_codes as permissive for select to authenticated using ((partner_id IN ( SELECT public.v2_my_partner_ids() AS v2_my_partner_ids)));
create policy partner_members_member_read on public.partner_members as permissive for select to authenticated using ((partner_id IN ( SELECT public.v2_my_partner_ids() AS v2_my_partner_ids)));
create policy partners_member_read on public.partners as permissive for select to authenticated using (((id IN ( SELECT public.v2_my_partner_ids() AS v2_my_partner_ids)) OR (parent_partner_id IN ( SELECT public.v2_my_partner_ids() AS v2_my_partner_ids))));
create policy pending_subscriptions_select_own on public.pending_subscriptions as permissive for select to public using ((organization_id IN ( SELECT m.organization_id
   FROM (public.memberships m
     JOIN public.accounts a ON ((a.person_id = m.person_id)))
  WHERE ((a.auth_user_id = auth.uid()) AND (m.status = 'activa'::text)))));
create policy people_select_orgmates on public.people as permissive for select to public using ((id IN ( SELECT m.person_id
   FROM public.memberships m
  WHERE (m.organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)))));
create policy person_additions_select on public.person_additions as permissive for select to public using (((person_id = public.v2_current_person_id()) OR (person_id IN ( SELECT m.person_id
   FROM public.memberships m
  WHERE (m.organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids))))));
create policy person_additions_write on public.person_additions as permissive for all to public using (((person_id = public.v2_current_person_id()) OR (EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.person_id = person_additions.person_id) AND (m.status = 'activa'::text) AND public.v2_is_duty_manager(m.organization_id)))))) with check (((person_id = public.v2_current_person_id()) OR (EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.person_id = person_additions.person_id) AND (m.status = 'activa'::text) AND public.v2_is_duty_manager(m.organization_id))))));
create policy person_documents_select on public.person_documents as permissive for select to public using (((person_id = public.v2_current_person_id()) OR (EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.person_id = person_documents.person_id) AND (m.status = 'activa'::text) AND public.v2_is_duty_manager(m.organization_id))))));
create policy person_documents_write on public.person_documents as permissive for all to public using (((person_id = public.v2_current_person_id()) OR (EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.person_id = person_documents.person_id) AND (m.status = 'activa'::text) AND public.v2_is_duty_manager(m.organization_id)))))) with check (((person_id = public.v2_current_person_id()) OR (EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.person_id = person_documents.person_id) AND (m.status = 'activa'::text) AND public.v2_is_duty_manager(m.organization_id))))));
create policy referral_commissions_member_read on public.referral_commissions as permissive for select to authenticated using ((referral_id IN ( SELECT referrals.id
   FROM public.referrals
  WHERE (referrals.partner_id IN ( SELECT public.v2_my_partner_ids() AS v2_my_partner_ids)))));
create policy referrals_member_read on public.referrals as permissive for select to authenticated using ((partner_id IN ( SELECT public.v2_my_partner_ids() AS v2_my_partner_ids)));
create policy risk_analyses_insert on public.risk_analyses as permissive for insert to public with check ((authorization_id IN ( SELECT authorization_requests.id
   FROM public.authorization_requests
  WHERE public.v2_is_duty_manager(authorization_requests.organization_id))));
create policy risk_analyses_select on public.risk_analyses as permissive for select to public using ((authorization_id IN ( SELECT authorization_requests.id
   FROM public.authorization_requests
  WHERE (authorization_requests.organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)))));
create policy risk_analyses_update on public.risk_analyses as permissive for update to public using ((authorization_id IN ( SELECT authorization_requests.id
   FROM public.authorization_requests
  WHERE public.v2_is_duty_manager(authorization_requests.organization_id)))) with check ((authorization_id IN ( SELECT authorization_requests.id
   FROM public.authorization_requests
  WHERE public.v2_is_duty_manager(authorization_requests.organization_id))));
create policy risk_assessments_insert on public.risk_assessments as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy risk_assessments_select on public.risk_assessments as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy risk_matrices_select on public.risk_matrices as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy risk_matrices_update on public.risk_matrices as permissive for update to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy risk_matrices_upsert on public.risk_matrices as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy safety_indicator_action_plans_insert on public.safety_indicator_action_plans as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy safety_indicator_action_plans_select on public.safety_indicator_action_plans as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy safety_indicator_monthly_insert on public.safety_indicator_monthly as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy safety_indicator_monthly_select on public.safety_indicator_monthly as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy safety_indicators_insert on public.safety_indicators as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy safety_indicators_select on public.safety_indicators as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy sms_case_actions_insert on public.sms_case_actions as permissive for insert to public with check (public.v2_is_sms_analyst(organization_id));
create policy sms_case_actions_select on public.sms_case_actions as permissive for select to public using (public.v2_is_sms_analyst(organization_id));
create policy sms_case_actions_update on public.sms_case_actions as permissive for update to public using (public.v2_is_sms_analyst(organization_id)) with check (public.v2_is_sms_analyst(organization_id));
create policy sms_case_events_insert on public.sms_case_events as permissive for insert to public with check (public.v2_is_sms_analyst(organization_id));
create policy sms_case_events_select on public.sms_case_events as permissive for select to public using (public.v2_is_sms_analyst(organization_id));
create policy sms_cases_insert on public.sms_cases as permissive for insert to public with check (public.v2_is_sms_analyst(organization_id));
create policy sms_cases_select on public.sms_cases as permissive for select to public using (public.v2_is_sms_analyst(organization_id));
create policy sms_cases_update on public.sms_cases as permissive for update to public using (public.v2_is_sms_analyst(organization_id)) with check (public.v2_is_sms_analyst(organization_id));
create policy sms_changes_select on public.sms_changes as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy sms_changes_write on public.sms_changes as permissive for all to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy sms_gap_assessments_delete on public.sms_gap_assessments as permissive for delete to public using (public.v2_is_duty_manager(organization_id));
create policy sms_gap_assessments_insert on public.sms_gap_assessments as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy sms_gap_assessments_select on public.sms_gap_assessments as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy sms_gap_assessments_update on public.sms_gap_assessments as permissive for update to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy sms_gap_question_visibility_delete on public.sms_gap_question_visibility as permissive for delete to public using (public.v2_is_duty_manager(organization_id));
create policy sms_gap_question_visibility_insert on public.sms_gap_question_visibility as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy sms_gap_question_visibility_select on public.sms_gap_question_visibility as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy sms_gap_question_visibility_update on public.sms_gap_question_visibility as permissive for update to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy sms_gap_questions_delete on public.sms_gap_questions as permissive for delete to public using (((organization_id IS NOT NULL) AND public.v2_is_duty_manager(organization_id)));
create policy sms_gap_questions_insert on public.sms_gap_questions as permissive for insert to public with check (((organization_id IS NOT NULL) AND public.v2_is_duty_manager(organization_id)));
create policy sms_gap_questions_select on public.sms_gap_questions as permissive for select to public using (((organization_id IS NULL) OR (organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids))));
create policy sms_gap_questions_update on public.sms_gap_questions as permissive for update to public using (((organization_id IS NOT NULL) AND public.v2_is_duty_manager(organization_id))) with check (((organization_id IS NOT NULL) AND public.v2_is_duty_manager(organization_id)));
create policy sms_gap_responses_delete on public.sms_gap_responses as permissive for delete to public using (public.v2_is_duty_manager(organization_id));
create policy sms_gap_responses_insert on public.sms_gap_responses as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy sms_gap_responses_select on public.sms_gap_responses as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy sms_gap_responses_update on public.sms_gap_responses as permissive for update to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy sms_implementation_plan_select on public.sms_implementation_plan as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy sms_implementation_plan_update on public.sms_implementation_plan as permissive for update to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy sms_implementation_plan_upsert on public.sms_implementation_plan as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy sms_implementation_tasks_delete on public.sms_implementation_tasks as permissive for delete to public using (public.v2_is_duty_manager(organization_id));
create policy sms_implementation_tasks_insert on public.sms_implementation_tasks as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy sms_implementation_tasks_select on public.sms_implementation_tasks as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy sms_implementation_tasks_update on public.sms_implementation_tasks as permissive for update to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy sms_monthly_reports_insert on public.sms_monthly_reports as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy sms_monthly_reports_select on public.sms_monthly_reports as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy sms_monthly_reports_update on public.sms_monthly_reports as permissive for update to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy sms_objective_indicators_delete on public.sms_objective_indicators as permissive for delete to public using ((EXISTS ( SELECT 1
   FROM public.sms_objectives o
  WHERE ((o.id = sms_objective_indicators.objective_id) AND public.v2_is_duty_manager(o.organization_id)))));
create policy sms_objective_indicators_insert on public.sms_objective_indicators as permissive for insert to public with check ((EXISTS ( SELECT 1
   FROM public.sms_objectives o
  WHERE ((o.id = sms_objective_indicators.objective_id) AND public.v2_is_duty_manager(o.organization_id)))));
create policy sms_objective_indicators_select on public.sms_objective_indicators as permissive for select to public using ((EXISTS ( SELECT 1
   FROM public.sms_objectives o
  WHERE ((o.id = sms_objective_indicators.objective_id) AND (o.organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids))))));
create policy sms_objectives_delete on public.sms_objectives as permissive for delete to public using (public.v2_is_duty_manager(organization_id));
create policy sms_objectives_insert on public.sms_objectives as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy sms_objectives_select on public.sms_objectives as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy sms_objectives_update on public.sms_objectives as permissive for update to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy sms_policies_insert on public.sms_policies as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy sms_policies_select on public.sms_policies as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy sms_policies_update on public.sms_policies as permissive for update to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy sms_report_attachments_select on public.sms_report_attachments as permissive for select to public using ((EXISTS ( SELECT 1
   FROM public.sms_reports r
  WHERE (r.id = sms_report_attachments.report_id))));
create policy sms_reports_insert on public.sms_reports as permissive for insert to public with check ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy sms_reports_select on public.sms_reports as permissive for select to public using (((reported_by = public.v2_current_person_id()) OR public.v2_is_duty_manager(organization_id)));
create policy sms_reports_update_analysis on public.sms_reports as permissive for update to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy sms_training_attendance_insert on public.sms_training_attendance as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy sms_training_attendance_select on public.sms_training_attendance as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy sms_training_sessions_insert on public.sms_training_sessions as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy sms_training_sessions_select on public.sms_training_sessions as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy subscriptions_insert on public.subscriptions as permissive for insert to public with check ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.organization_id = subscriptions.organization_id) AND (m.person_id = public.v2_current_person_id()) AND (m.status = 'activa'::text) AND (m.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))));
create policy subscriptions_select on public.subscriptions as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy subscriptions_update on public.subscriptions as permissive for update to public using ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.organization_id = subscriptions.organization_id) AND (m.person_id = public.v2_current_person_id()) AND (m.status = 'activa'::text) AND (m.role = ANY (ARRAY['admin'::text, 'superadmin'::text])))))) with check ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.organization_id = subscriptions.organization_id) AND (m.person_id = public.v2_current_person_id()) AND (m.status = 'activa'::text) AND (m.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))));
create policy supplier_audit_criteria_delete on public.supplier_audit_criteria as permissive for delete to public using (public.v2_is_duty_manager(organization_id));
create policy supplier_audit_criteria_insert on public.supplier_audit_criteria as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy supplier_audit_criteria_select on public.supplier_audit_criteria as permissive for select to public using (public.v2_is_duty_manager(organization_id));
create policy supplier_audit_criteria_update on public.supplier_audit_criteria as permissive for update to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy supplier_audits_delete on public.supplier_audits as permissive for delete to public using (public.v2_is_duty_manager(organization_id));
create policy supplier_audits_insert on public.supplier_audits as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy supplier_audits_select on public.supplier_audits as permissive for select to public using (public.v2_is_duty_manager(organization_id));
create policy supplier_audits_update on public.supplier_audits as permissive for update to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy suppliers_delete on public.suppliers as permissive for delete to public using (public.v2_is_duty_manager(organization_id));
create policy suppliers_insert on public.suppliers as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy suppliers_select on public.suppliers as permissive for select to public using (public.v2_is_duty_manager(organization_id));
create policy suppliers_update on public.suppliers as permissive for update to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy training_exam_attempts_select on public.training_exam_attempts as permissive for select to public using (((person_id = public.v2_current_person_id()) OR public.v2_is_duty_manager(organization_id)));
create policy training_exam_questions_insert on public.training_exam_questions as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy training_exam_questions_select on public.training_exam_questions as permissive for select to public using (public.v2_is_duty_manager(organization_id));
create policy training_exams_select on public.training_exams as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy training_exams_update on public.training_exams as permissive for update to public using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
create policy training_exams_upsert on public.training_exams as permissive for insert to public with check (public.v2_is_duty_manager(organization_id));
create policy unexpected_events_insert on public.unexpected_events as permissive for insert to public with check ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy unexpected_events_select on public.unexpected_events as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));
create policy unexpected_events_update on public.unexpected_events as permissive for update to public using (public.v2_is_duty_manager(organization_id));
create policy weather_observations_select on public.weather_observations as permissive for select to public using ((organization_id IN ( SELECT public.v2_current_organization_ids() AS v2_current_organization_ids)));

-- ============ Permisos de tablas y columnas ============
revoke all on table public.accounts from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.accounts to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.accounts to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.accounts to service_role;
revoke all on table public.aircraft from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.aircraft to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.aircraft to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.aircraft to service_role;
revoke all on table public.aircraft_components from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.aircraft_components to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.aircraft_components to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.aircraft_components to service_role;
revoke all on table public.aircraft_models from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.aircraft_models to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.aircraft_models to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.aircraft_models to service_role;
revoke all on table public.app_releases from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.app_releases to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.app_releases to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.app_releases to service_role;
revoke all on table public.authorization_requests from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.authorization_requests to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.authorization_requests to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.authorization_requests to service_role;
revoke all on table public.barriers from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.barriers to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.barriers to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.barriers to service_role;
revoke all on table public.batteries from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.batteries to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.batteries to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.batteries to service_role;
revoke all on table public.c2_events from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.c2_events to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.c2_events to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.c2_events to service_role;
revoke all on table public.c2_sessions from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.c2_sessions to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.c2_sessions to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.c2_sessions to service_role;
revoke all on table public.c2_telemetry from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.c2_telemetry to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.c2_telemetry to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.c2_telemetry to service_role;
revoke all on table public.capacitacion_evaluation_attempts from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.capacitacion_evaluation_attempts to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.capacitacion_evaluation_attempts to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.capacitacion_evaluation_attempts to service_role;
revoke all on table public.capacitacion_evaluation_questions from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.capacitacion_evaluation_questions to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.capacitacion_evaluation_questions to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.capacitacion_evaluation_questions to service_role;
revoke all on table public.capacitacion_evaluations from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.capacitacion_evaluations to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.capacitacion_evaluations to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.capacitacion_evaluations to service_role;
revoke all on table public.checklists from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.checklists to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.checklists to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.checklists to service_role;
revoke all on table public.colombia_geo from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.colombia_geo to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.colombia_geo to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.colombia_geo to service_role;
revoke all on table public.designations from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.designations to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.designations to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.designations to service_role;
revoke all on table public.dispatch_checklist_items from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.dispatch_checklist_items to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.dispatch_checklist_items to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.dispatch_checklist_items to service_role;
revoke all on table public.dispatches from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.dispatches to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.dispatches to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.dispatches to service_role;
revoke all on table public.duty_annual_certifications from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.duty_annual_certifications to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.duty_annual_certifications to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.duty_annual_certifications to service_role;
revoke all on table public.duty_exceptions from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.duty_exceptions to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.duty_exceptions to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.duty_exceptions to service_role;
revoke all on table public.duty_periods from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.duty_periods to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.duty_periods to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.duty_periods to service_role;
revoke all on table public.eta_items from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.eta_items to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.eta_items to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.eta_items to service_role;
revoke all on table public.etl_id_map from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.etl_id_map to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.etl_id_map to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.etl_id_map to service_role;
revoke all on table public.flights from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.flights to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.flights to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.flights to service_role;
revoke all on table public.free_grants from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.free_grants to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.free_grants to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.free_grants to service_role;
revoke all on table public.hazards from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.hazards to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.hazards to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.hazards to service_role;
revoke all on table public.insurance_policies from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.insurance_policies to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.insurance_policies to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.insurance_policies to service_role;
revoke all on table public.insurance_policy_aircraft from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.insurance_policy_aircraft to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.insurance_policy_aircraft to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.insurance_policy_aircraft to service_role;
revoke all on table public.invitations from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.invitations to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.invitations to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.invitations to service_role;
revoke all on table public.legacy_v1_rows from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.legacy_v1_rows to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.legacy_v1_rows to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.legacy_v1_rows to service_role;
revoke all on table public.legal_hold_events from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.legal_hold_events to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.legal_hold_events to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.legal_hold_events to service_role;
revoke all on table public.legal_hold_flights from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.legal_hold_flights to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.legal_hold_flights to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.legal_hold_flights to service_role;
revoke all on table public.legal_holds from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.legal_holds to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.legal_holds to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.legal_holds to service_role;
revoke all on table public.maintenance_events from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.maintenance_events to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.maintenance_events to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.maintenance_events to service_role;
revoke all on table public.maintenance_programs from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.maintenance_programs to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.maintenance_programs to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.maintenance_programs to service_role;
revoke all on table public.maintenance_tasks from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.maintenance_tasks to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.maintenance_tasks to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.maintenance_tasks to service_role;
revoke all on table public.manual_acknowledgments from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.manual_acknowledgments to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.manual_acknowledgments to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.manual_acknowledgments to service_role;
revoke all on table public.manual_versions from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.manual_versions to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.manual_versions to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.manual_versions to service_role;
revoke all on table public.manuales from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.manuales to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.manuales to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.manuales to service_role;
revoke all on table public.memberships from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.memberships to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.memberships to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.memberships to service_role;
revoke all on table public.missions from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.missions to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.missions to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.missions to service_role;
revoke all on table public.notifications from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE on table public.notifications to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE on table public.notifications to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.notifications to service_role;
grant UPDATE (read_at) on table public.notifications to authenticated;
revoke all on table public.organization_certifications from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.organization_certifications to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.organization_certifications to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.organization_certifications to service_role;
revoke all on table public.organization_emergency_contacts from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.organization_emergency_contacts to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.organization_emergency_contacts to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.organization_emergency_contacts to service_role;
revoke all on table public.organization_monthly_cycles from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.organization_monthly_cycles to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.organization_monthly_cycles to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.organization_monthly_cycles to service_role;
revoke all on table public.organizations from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.organizations to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.organizations to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.organizations to service_role;
revoke all on table public.partner_codes from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.partner_codes to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.partner_codes to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.partner_codes to service_role;
revoke all on table public.partner_invitations from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.partner_invitations to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.partner_invitations to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.partner_invitations to service_role;
revoke all on table public.partner_members from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.partner_members to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.partner_members to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.partner_members to service_role;
revoke all on table public.partners from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.partners to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.partners to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.partners to service_role;
revoke all on table public.pending_subscriptions from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.pending_subscriptions to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.pending_subscriptions to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.pending_subscriptions to service_role;
revoke all on table public.people from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.people to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.people to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.people to service_role;
revoke all on table public.person_additions from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.person_additions to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.person_additions to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.person_additions to service_role;
revoke all on table public.person_documents from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.person_documents to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.person_documents to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.person_documents to service_role;
revoke all on table public.referral_commissions from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.referral_commissions to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.referral_commissions to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.referral_commissions to service_role;
revoke all on table public.referrals from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.referrals to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.referrals to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.referrals to service_role;
revoke all on table public.risk_analyses from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.risk_analyses to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.risk_analyses to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.risk_analyses to service_role;
revoke all on table public.risk_assessments from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.risk_assessments to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.risk_assessments to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.risk_assessments to service_role;
revoke all on table public.risk_matrices from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.risk_matrices to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.risk_matrices to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.risk_matrices to service_role;
revoke all on table public.safety_indicator_action_plans from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.safety_indicator_action_plans to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.safety_indicator_action_plans to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.safety_indicator_action_plans to service_role;
revoke all on table public.safety_indicator_monthly from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.safety_indicator_monthly to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.safety_indicator_monthly to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.safety_indicator_monthly to service_role;
revoke all on table public.safety_indicators from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.safety_indicators to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.safety_indicators to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.safety_indicators to service_role;
revoke all on table public.sms_case_actions from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_case_actions to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_case_actions to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_case_actions to service_role;
revoke all on table public.sms_case_events from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_case_events to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_case_events to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_case_events to service_role;
revoke all on table public.sms_cases from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_cases to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_cases to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_cases to service_role;
revoke all on table public.sms_changes from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_changes to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_changes to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_changes to service_role;
revoke all on table public.sms_gap_assessments from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_gap_assessments to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_gap_assessments to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_gap_assessments to service_role;
revoke all on table public.sms_gap_question_visibility from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_gap_question_visibility to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_gap_question_visibility to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_gap_question_visibility to service_role;
revoke all on table public.sms_gap_questions from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_gap_questions to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_gap_questions to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_gap_questions to service_role;
revoke all on table public.sms_gap_responses from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_gap_responses to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_gap_responses to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_gap_responses to service_role;
revoke all on table public.sms_implementation_plan from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_implementation_plan to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_implementation_plan to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_implementation_plan to service_role;
revoke all on table public.sms_implementation_tasks from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_implementation_tasks to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_implementation_tasks to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_implementation_tasks to service_role;
revoke all on table public.sms_monthly_reports from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_monthly_reports to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_monthly_reports to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_monthly_reports to service_role;
revoke all on table public.sms_objective_indicators from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_objective_indicators to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_objective_indicators to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_objective_indicators to service_role;
revoke all on table public.sms_objectives from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_objectives to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_objectives to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_objectives to service_role;
revoke all on table public.sms_policies from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_policies to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_policies to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_policies to service_role;
revoke all on table public.sms_report_attachments from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_report_attachments to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_report_attachments to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_report_attachments to service_role;
revoke all on table public.sms_reports from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE on table public.sms_reports to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE on table public.sms_reports to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_reports to service_role;
grant UPDATE (analyzed_at) on table public.sms_reports to authenticated;
grant UPDATE (analyzed_by) on table public.sms_reports to authenticated;
grant UPDATE (filed_at) on table public.sms_reports to authenticated;
grant UPDATE (iris_reference) on table public.sms_reports to authenticated;
revoke all on table public.sms_training_attendance from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_training_attendance to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_training_attendance to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_training_attendance to service_role;
revoke all on table public.sms_training_sessions from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_training_sessions to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_training_sessions to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sms_training_sessions to service_role;
revoke all on table public.subscriptions from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.subscriptions to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.subscriptions to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.subscriptions to service_role;
revoke all on table public.supplier_audit_criteria from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.supplier_audit_criteria to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.supplier_audit_criteria to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.supplier_audit_criteria to service_role;
revoke all on table public.supplier_audits from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.supplier_audits to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.supplier_audits to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.supplier_audits to service_role;
revoke all on table public.suppliers from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.suppliers to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.suppliers to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.suppliers to service_role;
revoke all on table public.training_exam_attempts from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.training_exam_attempts to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.training_exam_attempts to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.training_exam_attempts to service_role;
revoke all on table public.training_exam_questions from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.training_exam_questions to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.training_exam_questions to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.training_exam_questions to service_role;
revoke all on table public.training_exams from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.training_exams to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.training_exams to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.training_exams to service_role;
revoke all on table public.unexpected_events from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.unexpected_events to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.unexpected_events to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.unexpected_events to service_role;
revoke all on table public.weather_observations from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.weather_observations to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.weather_observations to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.weather_observations to service_role;
revoke all on table public.wompi_processed_refs from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.wompi_processed_refs to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.wompi_processed_refs to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.wompi_processed_refs to service_role;

-- ============ Permisos de funciones ============
revoke all on function public.increment_aircraft_hours(p_id uuid, p_hours numeric) from public, anon, authenticated, service_role;
grant execute on function public.increment_aircraft_hours(p_id uuid, p_hours numeric) to authenticated;
grant execute on function public.increment_aircraft_hours(p_id uuid, p_hours numeric) to service_role;
revoke all on function public.increment_battery_cycles(p_id uuid, p_cycles numeric) from public, anon, authenticated, service_role;
grant execute on function public.increment_battery_cycles(p_id uuid, p_cycles numeric) to authenticated;
grant execute on function public.increment_battery_cycles(p_id uuid, p_cycles numeric) to service_role;
revoke all on function public.set_battery_cycles_if_greater(p_id uuid, p_cycles numeric) from public, anon, authenticated, service_role;
grant execute on function public.set_battery_cycles_if_greater(p_id uuid, p_cycles numeric) to authenticated;
grant execute on function public.set_battery_cycles_if_greater(p_id uuid, p_cycles numeric) to service_role;
revoke all on function public.v2_accept_invitation(p jsonb) from public, anon, authenticated, service_role;
grant execute on function public.v2_accept_invitation(p jsonb) to service_role;
revoke all on function public.v2_accept_partner_invitation(p jsonb) from public, anon, authenticated, service_role;
grant execute on function public.v2_accept_partner_invitation(p jsonb) to service_role;
revoke all on function public.v2_admin_delete_account(p_person uuid) from public, anon, authenticated, service_role;
grant execute on function public.v2_admin_delete_account(p_person uuid) to service_role;
revoke all on function public.v2_create_free_grant(p jsonb) from public, anon, authenticated, service_role;
grant execute on function public.v2_create_free_grant(p jsonb) to service_role;
revoke all on function public.v2_current_organization_ids() from public, anon, authenticated, service_role;
grant execute on function public.v2_current_organization_ids() to authenticated;
grant execute on function public.v2_current_organization_ids() to service_role;
revoke all on function public.v2_current_person_id() from public, anon, authenticated, service_role;
grant execute on function public.v2_current_person_id() to authenticated;
grant execute on function public.v2_current_person_id() to service_role;
revoke all on function public.v2_delete_free_grant(p_grant uuid, p_partner uuid) from public, anon, authenticated, service_role;
grant execute on function public.v2_delete_free_grant(p_grant uuid, p_partner uuid) to service_role;
revoke all on function public.v2_dispatch_close_only() from public, anon, authenticated, service_role;
grant execute on function public.v2_dispatch_close_only() to service_role;
revoke all on function public.v2_dispatch_close(p jsonb) from public, anon, authenticated, service_role;
grant execute on function public.v2_dispatch_close(p jsonb) to service_role;
revoke all on function public.v2_dispatch_create(p jsonb) from public, anon, authenticated, service_role;
grant execute on function public.v2_dispatch_create(p jsonb) to service_role;
revoke all on function public.v2_dispatch_items_immutable() from public, anon, authenticated, service_role;
grant execute on function public.v2_dispatch_items_immutable() to service_role;
revoke all on function public.v2_enforce_retention() from public, anon, authenticated, service_role;
grant execute on function public.v2_enforce_retention() to service_role;
revoke all on function public.v2_flight_replay_hold_guard() from public, anon, authenticated, service_role;
grant execute on function public.v2_flight_replay_hold_guard() to service_role;
revoke all on function public.v2_flight_under_hold(p_flight_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.v2_flight_under_hold(p_flight_id uuid) to service_role;
revoke all on function public.v2_is_duty_manager(p_organization_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.v2_is_duty_manager(p_organization_id uuid) to authenticated;
grant execute on function public.v2_is_duty_manager(p_organization_id uuid) to service_role;
revoke all on function public.v2_is_org_authority(p_organization_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.v2_is_org_authority(p_organization_id uuid) to authenticated;
grant execute on function public.v2_is_org_authority(p_organization_id uuid) to service_role;
revoke all on function public.v2_is_sms_analyst(p_organization_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.v2_is_sms_analyst(p_organization_id uuid) to authenticated;
grant execute on function public.v2_is_sms_analyst(p_organization_id uuid) to service_role;
revoke all on function public.v2_join_organization(p jsonb) from public, anon, authenticated, service_role;
grant execute on function public.v2_join_organization(p jsonb) to service_role;
revoke all on function public.v2_legal_hold_immutable() from public, anon, authenticated, service_role;
grant execute on function public.v2_legal_hold_immutable() to service_role;
revoke all on function public.v2_legal_hold_release_only() from public, anon, authenticated, service_role;
grant execute on function public.v2_legal_hold_release_only() to service_role;
revoke all on function public.v2_missions_lifecycle_guard() from public, anon, authenticated, service_role;
grant execute on function public.v2_missions_lifecycle_guard() to service_role;
revoke all on function public.v2_my_partner_ids() from public, anon, authenticated, service_role;
grant execute on function public.v2_my_partner_ids() to authenticated;
grant execute on function public.v2_my_partner_ids() to service_role;
revoke all on function public.v2_org_by_nit(p_nit text) from public, anon, authenticated, service_role;
grant execute on function public.v2_org_by_nit(p_nit text) to service_role;
revoke all on function public.v2_register_explotador(p jsonb) from public, anon, authenticated, service_role;
grant execute on function public.v2_register_explotador(p jsonb) to service_role;
revoke all on function public.v2_touch_updated_at() from public, anon, authenticated, service_role;
grant execute on function public.v2_touch_updated_at() to anon;
grant execute on function public.v2_touch_updated_at() to authenticated;
grant execute on function public.v2_touch_updated_at() to public;
grant execute on function public.v2_touch_updated_at() to service_role;

-- ============ Publicaciones (Realtime) ============
alter publication supabase_realtime add table public.notifications;
