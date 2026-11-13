-- Auditoría de seguridad 2026-11-12 (hallazgo alta): reclamar a una persona por correo sin verificar.
-- `v2_join_organization` y `v2_register_explotador` reutilizaban la fila `people` sin cuenta que tuviera el mismo
-- correo (la que un gestor crea en Tripulación). Pero el registro con contraseña crea el usuario con
-- `email_confirm: true` sin probar que el correo es de quien lo escribe: cualquiera que conociera el correo de un
-- tripulante podía registrarse antes que él y heredar sus membresías (rol, documento, licencia, certificado médico).
--
-- Ahora la persona existente solo se adopta si quien llama declara `email_verified = true` en el payload, y eso solo lo
-- hace el servidor cuando el correo está probado: la invitación por token (llega por correo) y el inicio con Google
-- (el proveedor verificó el correo). El registro por contraseña manda `false` y, si hay una persona sin cuenta con ese
-- correo, crea una persona nueva en vez de apropiarse de la del gestor.
-- Consecuencia de uso: un tripulante agregado a mano que se registra por su cuenta ya no hereda su ficha; el gestor lo
-- invita por correo desde Tripulación (la invitación sí enlaza la ficha, con el correo probado por el token).
-- Reversible: volver a las definiciones de 20261006110000 / baseline.

create or replace function public.v2_join_organization(p jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_auth uuid := (p ->> 'auth_user_id')::uuid;
  v_org uuid := (p ->> 'organization_id')::uuid;
  v_role text := p ->> 'role';
  v_email text := lower(coalesce(p ->> 'email', ''));
  v_allow_admin boolean := coalesce((p ->> 'allow_admin')::boolean, false);
  v_verified boolean := coalesce((p ->> 'email_verified')::boolean, false);
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
    -- Solo se adopta una persona existente si el correo está probado (ver cabecera).
    if v_verified and v_email <> '' then
      select pe.id into v_person from people pe
        where lower(pe.email) = v_email
          and not exists (select 1 from accounts a where a.person_id = pe.id)
        order by pe.created_at limit 1;
    end if;
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
$function$;

revoke execute on function public.v2_join_organization(jsonb) from public, anon, authenticated;

create or replace function public.v2_register_explotador(p jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_person uuid;
  v_org uuid;
  v_email text := lower(coalesce(p ->> 'email', ''));
  v_nit text := upper(regexp_replace(coalesce(p ->> 'nit', ''), '[\s\-.]', '', 'g'));
  v_trial int := coalesce((p ->> 'trial_days')::int, 15);
  v_verified boolean := coalesce((p ->> 'email_verified')::boolean, false);
begin
  if (p ->> 'auth_user_id') is null then raise exception 'Falta el usuario de autenticación'; end if;
  if v_nit = '' then raise exception 'El NIT es obligatorio'; end if;
  if exists (select 1 from organizations where upper(regexp_replace(nit, '[\s\-.]', '', 'g')) = v_nit) then
    raise exception 'Ya existe una organización registrada con ese NIT';
  end if;

  if v_verified and v_email <> '' then
    select pe.id into v_person from people pe
      where lower(pe.email) = v_email
        and not exists (select 1 from accounts a where a.person_id = pe.id)
      order by pe.created_at limit 1;
  end if;
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
$function$;

revoke execute on function public.v2_register_explotador(jsonb) from public, anon, authenticated;

-- La invitación prueba el correo con el token que llegó por correo: aquí sí se puede adoptar la persona.
create or replace function public.v2_accept_invitation(p jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
    'email', v_inv.email, 'email_verified', true,
    'full_name', p ->> 'full_name', 'phone', p ->> 'phone', 'attribution', p -> 'attribution'));

  update invitations set status = 'aceptada', accepted_at = now() where id = v_inv.id;
  return v_res;
end;
$function$;

revoke execute on function public.v2_accept_invitation(jsonb) from public, anon, authenticated;
