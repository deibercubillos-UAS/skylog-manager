-- Limitador de peticiones COMPARTIDO entre instancias (hallazgo S3 de 61-analisis-completo).
-- Antes el conteo vivía en un Map en memoria de cada instancia Vercel: un abusador que cayera en
-- otra instancia no quedaba bloqueado. Esta tabla + función atómica hacen que el límite valga global.
--
-- Solo el servidor (service_role) la usa, vía `lib/rateLimiter.js` con la llave de servicio. Nunca se
-- expone a anon/authenticated por PostgREST. Si la base no responde, el código cae al limitador en
-- memoria (fail-open): una caída de la base no debe tumbar registro/contacto.
-- Reversible: drop de la función y la tabla; el código vuelve solo al Map en memoria.

create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null
);

alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from anon, authenticated;

-- Incrementa y decide en una sola operación atómica (upsert con reinicio de ventana).
-- Devuelve si se permite, cuántas quedan y cuándo se reinicia la ventana.
create or replace function public.check_rate_limit(p_key text, p_limit integer, p_window_ms bigint)
 returns table(allowed boolean, remaining integer, reset_at timestamptz)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_now timestamptz := now();
  v_count integer;
  v_reset timestamptz;
begin
  insert into rate_limits as r (key, count, reset_at)
  values (p_key, 1, v_now + make_interval(secs => p_window_ms::double precision / 1000))
  on conflict (key) do update
    set count = case when r.reset_at < v_now then 1 else r.count + 1 end,
        reset_at = case when r.reset_at < v_now
                        then v_now + make_interval(secs => p_window_ms::double precision / 1000)
                        else r.reset_at end
  returning r.count, r.reset_at into v_count, v_reset;

  return query select (v_count <= p_limit), greatest(p_limit - v_count, 0), v_reset;
end;
$function$;

revoke all on function public.check_rate_limit(text, integer, bigint) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, bigint) to service_role;

-- Poda de claves vencidas (el upsert reinicia las que se vuelven a tocar; estas son las que nadie
-- volvió a tocar). La llama un cron liviano; no afecta la decisión del limitador.
create or replace function public.prune_rate_limits()
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_deleted integer;
begin
  delete from rate_limits where reset_at < now() - interval '1 hour';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$;

revoke all on function public.prune_rate_limits() from public, anon, authenticated;
grant execute on function public.prune_rate_limits() to service_role;
