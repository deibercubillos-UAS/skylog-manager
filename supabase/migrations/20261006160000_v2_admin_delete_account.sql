-- Skylog V2.0 — Etapa F: eliminar una cuenta desde el superadmin. Una sola transacción:
--  · las organizaciones donde la persona es el ÚNICO miembro activo se eliminan con todo lo suyo; si alguna tiene
--    registros operacionales bajo retención (5 años) o custodia legal, el trigger lo impide y NO se borra nada;
--  · en las demás organizaciones solo se cierra su membresía;
--  · la persona se elimina si ya nada la referencia; si aún firma registros que se conservan, se ANONIMIZA
--    (se quitan correo, teléfono, documento y contacto; el nombre se conserva porque figura en esos registros).
-- Devuelve el id del usuario de autenticación para que el servidor lo elimine después de que todo lo anterior salga bien.
create or replace function public.v2_admin_delete_account(p_person uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    delete from organizations where id = v_org; -- cascada; el trigger de retención puede abortar todo
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
$function$;
revoke execute on function public.v2_admin_delete_account(uuid) from public, anon, authenticated;
