-- Skylog V2.0 — alta de un explotador nuevo (Etapa A de docs/skylog-v2/44-alta-y-socios.md).
-- Una sola función atómica crea persona + cuenta + organización + membresía de administrador + suscripción de
-- prueba. La ejecuta SOLO el servidor (service role) DESPUÉS de crear el usuario de autenticación; si falla, el
-- servidor borra ese usuario, así nunca quedan cuentas a medias.

-- Atribución de marketing de la primera visita (v1: profiles.signup_attribution).
alter table accounts add column signup_attribution jsonb;

-- El NIT identifica a la organización al unirse por NIT (Etapa B): único, sin importar espacios/guiones/puntos.
create unique index organizations_nit_normalized_uidx
  on organizations (upper(regexp_replace(nit, '[\s\-.]', '', 'g')))
  where nit is not null and nit <> '';

create or replace function public.v2_register_explotador(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_person uuid;
  v_org uuid;
  v_nit text := upper(regexp_replace(coalesce(p ->> 'nit', ''), '[\s\-.]', '', 'g'));
  v_trial int := coalesce((p ->> 'trial_days')::int, 15);
begin
  if (p ->> 'auth_user_id') is null then raise exception 'Falta el usuario de autenticación'; end if;
  if v_nit = '' then raise exception 'El NIT es obligatorio'; end if;
  if exists (select 1 from organizations where upper(regexp_replace(nit, '[\s\-.]', '', 'g')) = v_nit) then
    raise exception 'Ya existe una organización registrada con ese NIT';
  end if;

  insert into people (full_name, email, phone)
  values (p ->> 'full_name', lower(p ->> 'email'), nullif(p ->> 'phone', ''))
  returning id into v_person;

  insert into accounts (person_id, auth_user_id, signup_attribution)
  values (v_person, (p ->> 'auth_user_id')::uuid, p -> 'attribution');

  insert into organizations (company_name, nit, nit_type, contact_email, phone)
  values (p ->> 'company_name', v_nit, nullif(p ->> 'nit_type', ''), lower(p ->> 'email'), nullif(p ->> 'phone', ''))
  returning id into v_org;

  insert into memberships (person_id, organization_id, role, status)
  values (v_person, v_org, 'admin', 'activa');

  insert into subscriptions (organization_id, plan, billing, expires_at, notes)
  values (v_org, 'piloto', 'monthly', now() + make_interval(days => v_trial), 'Prueba gratuita de registro');

  return jsonb_build_object('person_id', v_person, 'organization_id', v_org);
end;
$function$;

revoke execute on function public.v2_register_explotador(jsonb) from public, anon, authenticated;
