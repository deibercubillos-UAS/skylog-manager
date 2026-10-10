-- Skylog V2.0 — respaldo diario a R2 (`/api/cron/backup-r2`). Dos funciones de LECTURA que solo ejecuta la llave de servicio:
-- el listado de tablas de `public` y el volcado de una tabla (o de los usuarios) como JSON. Existen porque PostgREST no
-- expone el catálogo ni `auth`, y el plan gratuito de Supabase no trae copias de seguridad propias.
create or replace function public.v2_backup_table_names()
returns setof text language sql stable security definer set search_path = public, pg_temp as $$
  select tablename::text from pg_tables where schemaname = 'public' order by 1;
$$;

create or replace function public.v2_backup_dump(p_tabla text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v jsonb;
begin
  if p_tabla = 'auth_users' then
    select coalesce(jsonb_agg(jsonb_build_object('id', u.id, 'email', u.email, 'encrypted_password', u.encrypted_password,
      'email_confirmed_at', u.email_confirmed_at, 'raw_user_meta_data', u.raw_user_meta_data, 'created_at', u.created_at)), '[]'::jsonb)
      into v from auth.users u;
  elsif exists (select 1 from pg_tables where schemaname = 'public' and tablename = p_tabla) then
    execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from public.%I t', p_tabla) into v;
  else
    raise exception 'tabla no permitida: %', p_tabla;
  end if;
  return v;
end $$;

revoke all on function public.v2_backup_table_names() from public, anon, authenticated;
revoke all on function public.v2_backup_dump(text) from public, anon, authenticated;
grant execute on function public.v2_backup_table_names() to service_role;
grant execute on function public.v2_backup_dump(text) to service_role;
