-- PENDIENTE — aplicar SOLO después de desplegar el código que escribe los vuelos con la llave de servicio
-- (src/app/(v2)/api/flights/route.js, auditoría 2026-11-12) y de haber aplicado 20261112130000. Al aplicarla,
-- mover este archivo a supabase/migrations/ (la CLI no lee supabase/pending/).
-- Antes de eso, un piloto que importa un vuelo con el código viejo fallaría al insertar en `flights`.
--
-- 1) `flights`: insertar vuelos solo a GG/JP/superadmin (D5: el piloto no registra a mano; su importación pasa por la
--    ruta, que ya escribe con la llave de servicio). Cierra el insert directo por PostgREST con `source = 'importado'`.
-- 2) Contadores de aeronave y batería: solo el servidor o GG/JP/superadmin de la organización del recurso (J2/D4);
--    antes bastaba ser miembro, y un piloto podía inflar horas y ciclos llamando a la función directo.
-- Reversible: borrar flights_insert_rolegate y restaurar las funciones de 20261112130000.

create policy flights_insert_rolegate on public.flights as restrictive for insert to public
  with check (public.v2_has_org_role(organization_id, array['admin','jefe_pilotos','superadmin']::text[]));

create or replace function public.increment_aircraft_hours(p_id uuid, p_hours numeric)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if p_hours is null or p_hours < 0 or p_hours > 24 then
    raise exception 'Horas de vuelo fuera de rango (0 a 24 por vuelo)';
  end if;

  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' and not exists (
    select 1 from aircraft
    where id = p_id
      and public.v2_has_org_role(organization_id, array['admin','jefe_pilotos','superadmin']::text[])
  ) then
    raise exception 'Solo el Gerente General o el Jefe de Pilotos de la organización pueden cambiar las horas de la aeronave';
  end if;

  update aircraft set total_hours = total_hours + p_hours where id = p_id;
end;
$function$;

create or replace function public.increment_battery_cycles(p_id uuid, p_cycles numeric)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if p_cycles is null or p_cycles < 0 then
    raise exception 'Los ciclos a sumar no pueden ser negativos';
  end if;

  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' and not exists (
    select 1 from batteries
    where id = p_id
      and public.v2_has_org_role(organization_id, array['admin','jefe_pilotos','superadmin']::text[])
  ) then
    raise exception 'Solo el Gerente General o el Jefe de Pilotos de la organización pueden cambiar los ciclos de la batería';
  end if;

  update batteries set cycles = cycles + p_cycles where id = p_id;
end;
$function$;

create or replace function public.set_battery_cycles_if_greater(p_id uuid, p_cycles numeric)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if p_cycles is null or p_cycles < 0 or p_cycles > 10000 then
    raise exception 'Los ciclos de la batería están fuera de rango (0 a 10000)';
  end if;

  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' and not exists (
    select 1 from batteries
    where id = p_id
      and public.v2_has_org_role(organization_id, array['admin','jefe_pilotos','superadmin']::text[])
  ) then
    raise exception 'Solo el Gerente General o el Jefe de Pilotos de la organización pueden cambiar los ciclos de la batería';
  end if;

  update batteries set cycles = p_cycles where id = p_id and p_cycles > cycles;
end;
$function$;
