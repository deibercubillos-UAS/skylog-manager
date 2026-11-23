-- Skylog V2.0 — SMS comités: invitar por correo a un integrante externo (40a-sms-comites-srb-sag.md).
-- Un integrante solo-comité (asesor, proveedor, observador) entra con el rol de membresía `comite`.
-- Para que pueda aceptar una invitación y crear su cuenta, la tabla `invitations` debe permitir ese
-- rol y llevar a qué comité se le invita; y `v2_join_organization` debe aceptarlo al crear la membresía.
-- La fila en `sms_committee_members` la crea el servidor al aceptar (ver [token]/route.js), con el
-- person_id que devuelve el RPC. `memberships.role` no tiene CHECK, así que `comite` no requiere nada ahí.

-- `invitations.role`: permitir `comite`.
alter table invitations drop constraint invitations_role_check;
alter table invitations add constraint invitations_role_check
  check (role in ('piloto', 'jefe_pilotos', 'gerente_sms', 'admin', 'comite'));

-- Comité al que se invita (solo para invitaciones de rol `comite`).
alter table invitations add column committee text
  check (committee is null or committee in ('srb', 'sag'));

-- v2_join_organization: aceptar también `comite` (integrante solo-comité). El chequeo de cargo único
-- sigue aplicando solo a jefe_pilotos/gerente_sms; `comite` nunca choca y no cuenta contra el plan.
-- Copia idéntica del cuerpo vigente (20261006120000_v2_invitations.sql) con una sola línea cambiada.
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
  v_person uuid;
  v_member uuid;
begin
  if v_auth is null or v_org is null then raise exception 'Faltan datos para unirse'; end if;
  if v_role not in ('piloto', 'jefe_pilotos', 'gerente_sms', 'comite') and not (v_allow_admin and v_role = 'admin') then
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
$function$;
revoke execute on function public.v2_join_organization(jsonb) from public, anon, authenticated;
