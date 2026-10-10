-- Skylog V2.0 — CORTE EN EL MISMO PROYECTO (opción C) · PASO 1: congelar la v1 dentro de `legacy_v1`.
-- Se ejecuta UNA vez, con la v1 ya en solo lectura, en el SQL Editor del proyecto que aloja la v1 (o en su restauración de ensayo).
-- Es UNA transacción: si algo falla no queda nada a medias. Lo que hace:
--   1. Crea el esquema `legacy_v1` (no está expuesto por la API: nadie lo lee salvo el ETL y un administrador).
--   2. Mueve ahí TODAS las tablas de `public` y las funciones de `public` y `private` (los índices, restricciones, disparadores,
--      políticas y secuencias viajan con su tabla).
--   3. Guarda en `legacy_v1.cutover_estado` lo que va a quitar (disparador de `auth.users`, trabajos de pg_cron) para poder revertir.
--   4. Quita el disparador `on_auth_user_created` (crearía organizaciones y perfiles de v1 en cada registro de V2) y desprograma
--      los trabajos de pg_cron de v1 (llamarían funciones que ya no existen en `public`).
--   5. Saca las tablas movidas de la publicación de Realtime.
-- Los usuarios de `auth.users` NO se tocan: las cuentas conservan id y contraseña.
-- Después: `supabase/cutover/02_verificar_congelado.sql`, luego la base V2 (`node scripts/cutover/build-sql.mjs`) y el ETL `--in-place`.
begin;

do $cutover$
declare
  r record;
  n_tablas int := 0;
  n_funciones int := 0;
begin
  if exists (select 1 from pg_namespace where nspname = 'legacy_v1') then
    raise exception 'legacy_v1 ya existe: el congelado ya se ejecutó (o hay un intento previo). Revisa antes de repetir.';
  end if;
  if not exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'profiles') then
    raise exception 'No hay public.profiles: esta base no tiene el esquema de la v1.';
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'people') then
    raise exception 'public.people ya existe: la base ya tiene el esquema de V2.';
  end if;

  create schema legacy_v1;
  create table legacy_v1.cutover_estado (clave text primary key, valor jsonb not null, guardado_en timestamptz not null default now());
  revoke all on schema legacy_v1 from public, anon, authenticated;

  -- 3 · Lo que se va a quitar, guardado para poder revertir.
  insert into legacy_v1.cutover_estado
    select 'trigger_auth_users', to_jsonb(pg_get_triggerdef(t.oid)), now()
    from pg_trigger t where t.tgrelid = 'auth.users'::regclass and t.tgname = 'on_auth_user_created' and not t.tgisinternal;
  insert into legacy_v1.cutover_estado
    select 'cron_' || jobname, jsonb_build_object('schedule', schedule, 'command', command), now() from cron.job;
  insert into legacy_v1.cutover_estado
    select 'publicacion_realtime', to_jsonb(coalesce(array_agg(schemaname || '.' || tablename), '{}')), now()
    from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public';

  -- 4 · Quitar el disparador de auth.users y los trabajos de pg_cron de v1.
  drop trigger if exists on_auth_user_created on auth.users;
  for r in select jobname from cron.job loop
    perform cron.unschedule(r.jobname);
  end loop;

  -- 5 · Fuera de Realtime antes de mover (la tabla seguiría emitiendo con su nuevo esquema).
  for r in select tablename from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' loop
    execute format('alter publication supabase_realtime drop table public.%I', r.tablename);
  end loop;

  -- 2 · Tablas.
  for r in select tablename from pg_tables where schemaname = 'public' order by 1 loop
    execute format('alter table public.%I set schema legacy_v1', r.tablename);
    n_tablas := n_tablas + 1;
  end loop;

  -- 2 · Funciones de public y private (sin las que pertenecen a una extensión).
  for r in
    select p.oid::regprocedure::text as firma
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prokind in ('f', 'p')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
    order by 1
  loop
    execute format('alter function %s set schema legacy_v1', r.firma);
    n_funciones := n_funciones + 1;
  end loop;

  insert into legacy_v1.cutover_estado values ('resumen', jsonb_build_object('tablas', n_tablas, 'funciones', n_funciones), now());
  raise notice 'Congelado: % tablas y % funciones movidas a legacy_v1', n_tablas, n_funciones;
end
$cutover$;

-- Lectura para el ETL en el lugar (mismo contrato que public.etl_leer_tabla del ensayo, pero sobre legacy_v1).
create or replace function legacy_v1.etl_leer_tabla(p_tabla text)
returns setof jsonb language plpgsql stable security definer set search_path = legacy_v1, pg_temp as $$
begin
  if p_tabla = 'auth_users' then
    return query select jsonb_build_object('id', u.id, 'email', u.email, 'encrypted_password', u.encrypted_password,
      'email_confirmed_at', u.email_confirmed_at, 'raw_user_meta_data', u.raw_user_meta_data, 'created_at', u.created_at)
      from auth.users u;
  elsif exists (select 1 from pg_tables where schemaname = 'legacy_v1' and tablename = p_tabla) then
    return query execute format('select to_jsonb(t) from legacy_v1.%I t', p_tabla);
  else
    raise exception 'tabla no permitida: %', p_tabla;
  end if;
end $$;
revoke all on function legacy_v1.etl_leer_tabla(text) from public, anon, authenticated;

do $grant$ begin
  if exists (select 1 from pg_roles where rolname = 'etl_solo_lectura') then
    grant usage on schema legacy_v1 to etl_solo_lectura;
    grant select on all tables in schema legacy_v1 to etl_solo_lectura;
    grant execute on function legacy_v1.etl_leer_tabla(text) to etl_solo_lectura;
  end if;
end $grant$;

commit;
