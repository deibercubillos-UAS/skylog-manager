-- Skylog V2.0 — corte (opción C) · REVERSA: devuelve el proyecto a la v1 (tablas y funciones de vuelta a `public`, disparador
-- de `auth.users` y trabajos de pg_cron restaurados). SOLO es seguro si V2 todavía NO aceptó escrituras reales: borra
-- TODO lo que hay hoy en `public` (que es la V2). Si ya hay despachos o vuelos nuevos de V2, aborta.
-- Para forzarlo sabiendo que se pierde lo escrito en V2: ejecutar antes `set app.forzar_reversa = 'si';` en la misma sesión.
begin;

do $revert$
declare
  r record;
  e record;
  cmd text;
begin
  if not exists (select 1 from pg_namespace where nspname = 'legacy_v1') then
    raise exception 'No existe legacy_v1: no hay nada que revertir.';
  end if;

  if coalesce(current_setting('app.forzar_reversa', true), '') <> 'si' then
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'dispatches') then
      if (select count(*) from public.dispatches) > 0 or (select count(*) from public.sms_reports where created_at > (select guardado_en from legacy_v1.cutover_estado where clave = 'resumen')) > 0 then
        raise exception 'V2 ya tiene despachos o reportes posteriores al corte: revertir los perdería. Aborto.';
      end if;
    end if;
  end if;

  -- 1 · Fuera todo lo de V2 en public (tablas con CASCADE y funciones).
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;
  for r in
    select p.oid::regprocedure::text as firma from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind in ('f', 'p') and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('drop function if exists %s cascade', r.firma);
  end loop;

  -- 2 · Función de lectura del ETL: no vuelve.
  drop function if exists legacy_v1.etl_leer_tabla(text);

  -- 3 · Tablas de vuelta a public.
  for r in select tablename from pg_tables where schemaname = 'legacy_v1' and tablename <> 'cutover_estado' loop
    execute format('alter table legacy_v1.%I set schema public', r.tablename);
  end loop;

  -- 4 · Funciones de vuelta. Todas regresan a `public` (también las que eran de `private`: las políticas y disparadores de la v1
  --     guardan el OID de la función, no el nombre, así que siguen funcionando).
  for r in
    select p.oid::regprocedure::text as firma from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'legacy_v1' and p.prokind in ('f', 'p')
  loop
    execute format('alter function %s set schema public', r.firma);
  end loop;

  -- 5 · Disparador de auth.users, trabajos de pg_cron y Realtime.
  select valor #>> '{}' into cmd from legacy_v1.cutover_estado where clave = 'trigger_auth_users';
  if cmd is not null then execute cmd; end if;
  for e in select clave, valor from legacy_v1.cutover_estado where clave like 'cron\_%' escape '\' loop
    perform cron.schedule(substr(e.clave, 6), e.valor ->> 'schedule', e.valor ->> 'command');
  end loop;
  for e in select jsonb_array_elements_text(valor) as t from legacy_v1.cutover_estado where clave = 'publicacion_realtime' loop
    execute format('alter publication supabase_realtime add table %s', e.t);
  end loop;

  -- 6 · Se conserva legacy_v1.cutover_estado un momento para auditar; se borra el esquema vacío.
  drop table legacy_v1.cutover_estado;
  drop schema legacy_v1;
  raise notice 'Revertido: la base vuelve a ser la v1.';
end
$revert$;

commit;
