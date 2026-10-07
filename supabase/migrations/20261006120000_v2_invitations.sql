-- Skylog V2.0 — invitación de tripulantes por correo (Etapa C de docs/skylog-v2/44-alta-y-socios.md).
-- Un gestor invita a alguien a su organización con un rol; la persona acepta con un enlace con token (7 días).
-- La tabla solo la escribe el servidor; los gestores de la organización la leen. Aceptar es atómico
-- (`v2_accept_invitation`) y reutiliza la persona que el gestor ya hubiera creado en Tripulación.

create table invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  name text,
  role text not null check (role in ('piloto', 'jefe_pilotos', 'gerente_sms', 'admin')),
  person_id uuid references people(id) on delete set null,
  invited_by uuid references people(id) on delete set null,
  token text not null unique,
  status text not null default 'pendiente' check (status in ('pendiente', 'aceptada', 'revocada', 'expirada')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
comment on table invitations is 'Invitación por correo a una organización (RAC: nada que ver con retención). El token es la capacidad de aceptarla; solo el servidor escribe.';
create index invitations_org_idx on invitations (organization_id, created_at desc);
-- Una sola invitación pendiente por correo y organización (reinvitar revoca la anterior).
create unique index invitations_pending_uidx on invitations (organization_id, lower(email)) where status = 'pendiente';

alter table invitations enable row level security;
create policy invitations_select_managers on invitations
  for select using (v2_is_duty_manager(organization_id));

-- `v2_join_organization` acepta además el rol `admin` cuando lo pide una invitación (`allow_admin`): unirse por NIT
-- nunca puede dar Gerente General, una invitación de un Gerente General sí.
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
$function$;
revoke execute on function public.v2_join_organization(jsonb) from public, anon, authenticated;

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

  -- La persona que el gestor ya había agregado a Tripulación (si no tiene acceso) es la que recibe la cuenta.
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
$function$;
revoke execute on function public.v2_accept_invitation(jsonb) from public, anon, authenticated;
