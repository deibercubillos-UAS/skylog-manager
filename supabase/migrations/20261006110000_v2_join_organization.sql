-- Skylog V2.0 — unirse a una organización existente por NIT (Etapa B de docs/skylog-v2/44-alta-y-socios.md).
-- Dos cambios, ambos atómicos y solo ejecutables por el servidor (service role):
-- 1) `v2_join_organization`: persona (la de la cuenta, o la que un gestor ya había creado con ese correo y que
--    todavía no tenía acceso, o una nueva) + cuenta si hace falta + membresía. Bloquea la fila de la organización
--    mientras valida, así dos personas no pueden tomar a la vez un cargo único (Jefe de Pilotos, Gerente SMS).
-- 2) `v2_register_explotador` (Etapa A) ahora también reutiliza una persona sin cuenta con el mismo correo, en vez
--    de duplicarla: un gestor puede haber agregado a la tripulación antes de que ella se registre.

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
  v_person uuid;
  v_member uuid;
begin
  if v_auth is null or v_org is null then raise exception 'Faltan datos para unirse'; end if;
  if v_role not in ('piloto', 'jefe_pilotos', 'gerente_sms') then raise exception 'Rol no permitido para unirse a una organización'; end if;

  perform 1 from organizations where id = v_org for update;
  if not found then raise exception 'La organización no existe'; end if;

  -- Persona: la de la cuenta; si no hay cuenta, una sin acceso con el mismo correo; si no, una nueva.
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
$function$;

revoke execute on function public.v2_join_organization(jsonb) from public, anon, authenticated;

-- Etapa A: reutilizar la persona sin cuenta con el mismo correo.
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
$function$;

revoke execute on function public.v2_register_explotador(jsonb) from public, anon, authenticated;

-- Búsqueda de una organización por NIT sin importar espacios, guiones o puntos (el NIT se guarda como lo escribe
-- el gestor, p. ej. «900.123.456-7»; el índice único usa la forma normalizada).
create or replace function public.v2_org_by_nit(p_nit text)
returns table (id uuid, company_name text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select o.id, o.company_name from organizations o
  where upper(regexp_replace(coalesce(o.nit, ''), '[\s\-.]', '', 'g')) = upper(regexp_replace(coalesce(p_nit, ''), '[\s\-.]', '', 'g'))
    and coalesce(o.nit, '') <> ''
  limit 1;
$$;
revoke execute on function public.v2_org_by_nit(text) from public, anon, authenticated;
