-- Skylog V2.0 — regalos de perfiles gratis (Etapa E2). Dos funciones atómicas: crear un regalo reservando un cupo
-- sin que dos solicitudes simultáneas pasen el límite, y anularlo devolviendo el cupo. `reminder_sent_at` evita
-- repetir el aviso previo al vencimiento.
alter table public.free_grants add column if not exists reminder_sent_at timestamptz;

create or replace function public.v2_create_free_grant(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
$function$;
revoke execute on function public.v2_create_free_grant(jsonb) from public, anon, authenticated;

create or replace function public.v2_delete_free_grant(p_grant uuid, p_partner uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_grant free_grants%rowtype;
begin
  select * into v_grant from free_grants where id = p_grant and partner_id = p_partner for update;
  if not found then raise exception 'Regalo no encontrado'; end if;
  delete from free_grants where id = v_grant.id;
  update partners set free_seats_used = greatest(0, free_seats_used - 1) where id = p_partner;
  return jsonb_build_object('redeemed_organization_id', v_grant.redeemed_organization_id);
end;
$function$;
revoke execute on function public.v2_delete_free_grant(uuid, uuid) from public, anon, authenticated;

-- Aceptar la invitación de un socio (dueño o asesor): crea persona + cuenta si hace falta y lo vincula al panel.
create or replace function public.v2_accept_partner_invitation(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
$function$;
revoke execute on function public.v2_accept_partner_invitation(jsonb) from public, anon, authenticated;
