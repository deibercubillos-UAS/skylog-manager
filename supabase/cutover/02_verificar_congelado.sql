-- Skylog V2.0 — corte (opción C) · PASO 2: comprobar el congelado. Todas las filas deben decir ok = true.
select 'public sin tablas de la v1' as comprobacion, count(*) = 0 as ok, count(*) as valor from pg_tables where schemaname = 'public'
union all select 'legacy_v1 tiene las tablas', count(*) >= 80, count(*) from pg_tables where schemaname = 'legacy_v1'
union all select 'public sin funciones propias', count(*) = 0, count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
union all select 'sin disparador en auth.users', count(*) = 0, count(*) from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal
union all select 'sin trabajos de pg_cron', count(*) = 0, count(*) from cron.job
union all select 'usuarios intactos', count(*) > 0, count(*) from auth.users
union all select 'estado guardado para revertir', count(*) >= 2, count(*) from legacy_v1.cutover_estado
union all select 'legacy_v1 no expuesto a la API', not has_schema_privilege('anon', 'legacy_v1', 'usage') and not has_schema_privilege('authenticated', 'legacy_v1', 'usage'), 0;
