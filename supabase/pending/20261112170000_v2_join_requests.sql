-- Auditoría de seguridad 2026-11-12 — unirse por NIT sin aprobación. El NIT de una empresa no es secreto y quien se
-- une ELIGE su rol: cualquiera podía entrar como piloto, o quedarse con un cargo vacío de Jefe de Pilotos o Gerente SMS
-- (y con él ver los reportes SMS), con solo conocer el NIT. Ahora unirse por NIT crea una SOLICITUD que un Gerente
-- General o Jefe de Pilotos aprueba o rechaza; la membresía solo se crea al aprobar. La solicitud va en una tabla aparte
-- (no se agrega un estado a `memberships`, que leen decenas de consultas). La invitación por correo no cambia: el
-- gestor ya la autorizó al enviarla.
-- Reversible: drop function public.v2_request_join(jsonb); drop table public.join_requests;

create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  role text not null check (role in ('piloto', 'jefe_pilotos', 'gerente_sms')),
  status text not null default 'pendiente' check (status in ('pendiente', 'aprobada', 'rechazada')),
  decided_by uuid references public.people(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index join_requests_pending_uidx on public.join_requests (person_id, organization_id) where status = 'pendiente';
create index join_requests_org_idx on public.join_requests (organization_id, status, created_at desc);

alter table public.join_requests enable row level security;
-- Lectura: la propia persona o un gestor que puede aprobar (GG, JP, superadmin) de esa organización.
create policy join_requests_select on public.join_requests for select
  using (person_id = public.v2_current_person_id() or public.v2_has_org_role(organization_id, array['admin', 'jefe_pilotos', 'superadmin']::text[]));
-- Sin políticas de escritura: solo el servidor (llave de servicio) crea y decide solicitudes.
revoke all on table public.join_requests from anon, authenticated;
grant select on table public.join_requests to authenticated;

-- Crea la solicitud (y la persona/cuenta si es un registro nuevo). Misma regla de correo que v2_join_organization:
-- una persona sin cuenta con ese correo solo se adopta si `email_verified` es true.
create or replace function public.v2_request_join(p jsonb)
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
  v_verified boolean := coalesce((p ->> 'email_verified')::boolean, false);
  v_person uuid;
  v_req uuid;
begin
  if v_auth is null or v_org is null then raise exception 'Faltan datos para unirse'; end if;
  if v_role not in ('piloto', 'jefe_pilotos', 'gerente_sms') then raise exception 'Rol no permitido para unirse a una organización'; end if;

  perform 1 from organizations where id = v_org for update;
  if not found then raise exception 'La organización no existe'; end if;

  select person_id into v_person from accounts where auth_user_id = v_auth;
  if v_person is null then
    if v_verified and v_email <> '' then
      select pe.id into v_person from people pe
        where lower(pe.email) = v_email and not exists (select 1 from accounts a where a.person_id = pe.id)
        order by pe.created_at limit 1;
    end if;
    if v_person is null then
      insert into people (full_name, email, phone) values (p ->> 'full_name', nullif(v_email, ''), nullif(p ->> 'phone', '')) returning id into v_person;
    else
      update people set full_name = coalesce(nullif(p ->> 'full_name', ''), full_name), phone = coalesce(nullif(p ->> 'phone', ''), phone) where id = v_person;
    end if;
    insert into accounts (person_id, auth_user_id, signup_attribution) values (v_person, v_auth, p -> 'attribution');
  end if;

  if exists (select 1 from memberships where person_id = v_person and organization_id = v_org and status = 'activa') then
    raise exception 'Ya eres miembro de esta organización';
  end if;
  if exists (select 1 from join_requests where person_id = v_person and organization_id = v_org and status = 'pendiente') then
    raise exception 'Ya tienes una solicitud pendiente en esta organización';
  end if;
  -- Tope para que nadie inunde a los gestores de una organización con solicitudes.
  if (select count(*) from join_requests where organization_id = v_org and status = 'pendiente') >= 25 then
    raise exception 'La organización tiene demasiadas solicitudes pendientes';
  end if;

  insert into join_requests (organization_id, person_id, role) values (v_org, v_person, v_role) returning id into v_req;
  return jsonb_build_object('request_id', v_req, 'person_id', v_person, 'organization_id', v_org);
end;
$function$;

revoke execute on function public.v2_request_join(jsonb) from public, anon, authenticated;
