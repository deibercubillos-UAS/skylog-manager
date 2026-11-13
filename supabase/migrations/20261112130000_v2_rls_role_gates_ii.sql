-- Auditoría de seguridad 2026-11-12 — la matriz de permisos se aplicaba solo en las rutas de la API; con la sesión del
-- usuario y la llave pública se podía escribir directo por PostgREST con un rol que la matriz no permite.
-- Esta migración cierra los huecos que NO necesitan cambio de código (las rutas ya hacen lo que ahora exige la base):
--   1) Fichas de tripulación (K4: GG, JP): `person_additions` y `person_documents` — antes escribía también el Gerente SMS.
--   2) Designaciones (AD9: GG, Gerente SMS): `designations` — antes escribía también el Jefe de Pilotos.
--   3) Reportes SMS: el autor es siempre quien llama (S2). Los borradores automáticos ya usan `reported_by = personId`;
--      los reportes públicos y el examen usan la llave de servicio, que no pasa por RLS.
--   4) `app_releases` y `wompi_processed_refs`: solo las escribe el servidor (llave de servicio); se quitan los permisos
--      de escritura de `anon` y `authenticated`, que dependían solo de RLS.
--   5) Contadores: `set_battery_cycles_if_greater` no tenía tope; y las tres funciones aceptan ahora también a la llave
--      de servicio (preparación del paso 2 de la auditoría: mover la escritura de vuelos al servidor). Sigue valiendo la
--      membresía, así que esta migración se puede aplicar antes o después del despliegue.
-- NO incluye (necesitan cambio de código o de diseño, ver docs/skylog-v2/60-auditoria-codigo.md): vuelos y contadores solo
-- para gestores (supabase/pending/20261112140000_v2_flights_server_only.sql), y la identidad del reportante confidencial
-- (`sms_reports.reported_by`/`reporter_contact`), que exige listar columnas en las lecturas.
-- Reversible: borrar las políticas creadas aquí, volver a conceder los permisos y restaurar las funciones de 20261016120000.

-- 1) person_additions y person_documents — escribe la propia persona o GG/JP/superadmin de una organización donde está activa.
create policy person_additions_insert_rolegate on public.person_additions as restrictive for insert to public
  with check (person_id = public.v2_current_person_id() or exists (
    select 1 from public.memberships m where m.person_id = person_additions.person_id and m.status = 'activa'
      and public.v2_has_org_role(m.organization_id, array['admin','jefe_pilotos','superadmin']::text[])));
create policy person_additions_update_rolegate on public.person_additions as restrictive for update to public
  using (person_id = public.v2_current_person_id() or exists (
    select 1 from public.memberships m where m.person_id = person_additions.person_id and m.status = 'activa'
      and public.v2_has_org_role(m.organization_id, array['admin','jefe_pilotos','superadmin']::text[])))
  with check (person_id = public.v2_current_person_id() or exists (
    select 1 from public.memberships m where m.person_id = person_additions.person_id and m.status = 'activa'
      and public.v2_has_org_role(m.organization_id, array['admin','jefe_pilotos','superadmin']::text[])));
create policy person_additions_delete_rolegate on public.person_additions as restrictive for delete to public
  using (person_id = public.v2_current_person_id() or exists (
    select 1 from public.memberships m where m.person_id = person_additions.person_id and m.status = 'activa'
      and public.v2_has_org_role(m.organization_id, array['admin','jefe_pilotos','superadmin']::text[])));

create policy person_documents_insert_rolegate on public.person_documents as restrictive for insert to public
  with check (person_id = public.v2_current_person_id() or exists (
    select 1 from public.memberships m where m.person_id = person_documents.person_id and m.status = 'activa'
      and public.v2_has_org_role(m.organization_id, array['admin','jefe_pilotos','superadmin']::text[])));
create policy person_documents_update_rolegate on public.person_documents as restrictive for update to public
  using (person_id = public.v2_current_person_id() or exists (
    select 1 from public.memberships m where m.person_id = person_documents.person_id and m.status = 'activa'
      and public.v2_has_org_role(m.organization_id, array['admin','jefe_pilotos','superadmin']::text[])))
  with check (person_id = public.v2_current_person_id() or exists (
    select 1 from public.memberships m where m.person_id = person_documents.person_id and m.status = 'activa'
      and public.v2_has_org_role(m.organization_id, array['admin','jefe_pilotos','superadmin']::text[])));
create policy person_documents_delete_rolegate on public.person_documents as restrictive for delete to public
  using (person_id = public.v2_current_person_id() or exists (
    select 1 from public.memberships m where m.person_id = person_documents.person_id and m.status = 'activa'
      and public.v2_has_org_role(m.organization_id, array['admin','jefe_pilotos','superadmin']::text[])));

-- 2) designations — GG y Gerente SMS (el Jefe de Pilotos solo ve).
create policy designations_insert_rolegate on public.designations as restrictive for insert to public
  with check (public.v2_has_org_role(organization_id, array['admin','gerente_sms','superadmin']::text[]));
create policy designations_update_rolegate on public.designations as restrictive for update to public
  using (public.v2_has_org_role(organization_id, array['admin','gerente_sms','superadmin']::text[]))
  with check (public.v2_has_org_role(organization_id, array['admin','gerente_sms','superadmin']::text[]));

-- 3) sms_reports — el autor es quien llama (regla S2); nadie atribuye un reporte a otra persona.
create policy sms_reports_insert_owner on public.sms_reports as restrictive for insert to public
  with check (reported_by = public.v2_current_person_id());

-- 4) Tablas que solo escribe el servidor.
revoke insert, update, delete, truncate on table public.app_releases from anon, authenticated;
revoke all on table public.wompi_processed_refs from anon, authenticated;

-- 5) Contadores: tope en `set_battery_cycles_if_greater` y aceptar la llave de servicio (además de la membresía).
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
      and organization_id in (select v2_current_organization_ids())
  ) then
    raise exception 'Sin membresía activa en la organización de esta aeronave';
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
      and organization_id in (select v2_current_organization_ids())
  ) then
    raise exception 'Sin membresía activa en la organización de esta batería';
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
      and organization_id in (select v2_current_organization_ids())
  ) then
    raise exception 'Sin membresía activa en la organización de esta batería';
  end if;

  update batteries set cycles = p_cycles where id = p_id and p_cycles > cycles;
end;
$function$;

revoke all on function public.increment_aircraft_hours(uuid, numeric) from public, anon;
revoke all on function public.increment_battery_cycles(uuid, numeric) from public, anon;
revoke all on function public.set_battery_cycles_if_greater(uuid, numeric) from public, anon;
grant execute on function public.increment_aircraft_hours(uuid, numeric) to authenticated, service_role;
grant execute on function public.increment_battery_cycles(uuid, numeric) to authenticated, service_role;
grant execute on function public.set_battery_cycles_if_greater(uuid, numeric) to authenticated, service_role;
