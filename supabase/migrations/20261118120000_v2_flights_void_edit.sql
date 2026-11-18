-- Skylog V2.0 — editar y anular vuelos (matriz D6: GG, JP y superadmin). Decisión 221.
-- Un vuelo es un evento: no se borra. «Anular» lo marca con fecha, autor y motivo y lo oculta de la bitácora, los
-- reportes y los límites de horas; «editar» corrige sus datos y deja constancia de quién y cuándo (el detalle antes/después
-- va al registro de acciones `audit_log`). Todo cambio lo hace el servidor con la llave de servicio tras verificar rol (D6).
-- Aditiva y reversible: las columnas nuevas son nulas; la política nueva solo agrega `voided_at is null`.

alter table public.flights
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references public.people(id),
  add column if not exists void_reason text,
  add column if not exists edited_at timestamptz,
  add column if not exists edited_by uuid references public.people(id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'flights_void_reason_consistent') then
    alter table public.flights
      add constraint flights_void_reason_consistent check ((voided_at is null) = (void_reason is null));
  end if;
end $$;

comment on column public.flights.voided_at is 'Anulado: el vuelo no cuenta en reportes, horas ni límites. Se conserva el registro (void_reason, voided_by).';

-- Un vuelo anulado deja de verse para todo lo que lee con la sesión del usuario (bitácora, reportes, límites §100.540,
-- indicadores). La lista de anulados la lee el servidor con la llave de servicio, solo para gestores.
alter policy flights_select on public.flights using (
  voided_at is null
  and (pilot_person_id = v2_current_person_id() or v2_is_duty_manager(organization_id))
);

-- Ajuste de horas de la aeronave al editar/anular (puede ser negativo, nunca baja de 0). Solo el servidor.
create or replace function public.adjust_aircraft_hours(p_id uuid, p_delta numeric)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Solo el servidor puede ajustar las horas de la aeronave';
  end if;
  if p_delta is null or p_delta < -24 or p_delta > 24 then
    raise exception 'Ajuste de horas fuera de rango (±24)';
  end if;
  update aircraft set total_hours = greatest(0, total_hours + p_delta) where id = p_id;
end;
$function$;

revoke execute on function public.adjust_aircraft_hours(uuid, numeric) from public, anon, authenticated;
grant execute on function public.adjust_aircraft_hours(uuid, numeric) to service_role;
