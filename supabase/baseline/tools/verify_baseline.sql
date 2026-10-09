-- Verifica 00_v2_baseline.sql: lo aplica sobre un esquema `public` vacío DENTRO de una transacción que siempre se
-- revierte (el RAISE final) y compara sección por sección con el esquema original. Requiere:
--   1) public._v2_dump(text) instalada (tools/dump_schema.sql)
--   2) public._baseline_txt(id int primary key, body text) con el contenido de 00_v2_baseline.sql en id = 1
-- El resultado llega como el texto del error. Esperado: todo IGUAL salvo los objetos auxiliares _baseline_txt y _v2_dump.
do $t$
declare
  body text; old jsonb; new jsonb; k text; res text := ''; a text[]; b text[]; only_old text; only_new text;
begin
  select b2.body into body from public._baseline_txt b2 where id = 1;
  alter schema public rename to public_old;
  create schema public;
  grant usage on schema public to postgres, anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
  execute body;
  old := public_old._v2_dump('public_old');
  new := public_old._v2_dump('public');
  for k in select jsonb_object_keys(old) loop
    a := string_to_array(replace(old ->> k, 'public_old.', 'public.'), E'\n');
    b := string_to_array(new ->> k, E'\n');
    select string_agg(x, ' || ') into only_old from (select x from unnest(a) x except select x from unnest(b) x limit 4) q;
    select string_agg(x, ' || ') into only_new from (select x from unnest(b) x except select x from unnest(a) x limit 4) q;
    res := res || k || ': ' || case when only_old is null and only_new is null then 'IGUAL' else 'DIFIERE old=[' || coalesce(left(only_old, 700), '') || '] new=[' || coalesce(left(only_new, 700), '') || ']' end || E'\n';
  end loop;
  raise exception E'RESULTADO\n%', res;
end $t$;
