-- Auditoría 2026-10-16, punto 1 — cuatro huecos de integridad que se podían explotar llamando a la API de Supabase
-- directamente con la sesión de un usuario (sin pasar por las rutas de la app).

-- 1) Suscripciones: un Gerente General podía ponerse cualquier plan y vencimiento (p. ej. Enterprise sin vencimiento).
--    Todos los escritores legítimos (pago Wompi, cancelación, panel de la plataforma, socios, regalos, cron) usan la
--    llave de servicio, que no pasa por RLS. Sin política de escritura, el usuario solo puede leer.
drop policy if exists subscriptions_insert on public.subscriptions;
drop policy if exists subscriptions_update on public.subscriptions;

-- 2) Vuelos y períodos de servicio: la rama «soy el piloto» no comprobaba la organización, así que cualquier usuario
--    podía escribir en la bitácora o los tiempos de servicio de otra empresa (y la retención de 5 años impedía borrarlo).
alter policy flights_insert on public.flights with check (
  ((pilot_person_id = v2_current_person_id()) and organization_id in (select v2_current_organization_ids()))
  or v2_is_duty_manager(organization_id)
);

alter policy duty_periods_insert on public.duty_periods with check (
  ((person_id = v2_current_person_id()) and organization_id in (select v2_current_organization_ids()))
  or v2_is_duty_manager(organization_id)
);

alter policy duty_periods_update_close_only on public.duty_periods with check (
  ((person_id = v2_current_person_id()) and organization_id in (select v2_current_organization_ids()))
  or v2_is_duty_manager(organization_id)
);

-- 3) Intentos de examen: un piloto podía insertar su propio intento con passed = true y saltarse la calificación
--    (y el bloqueo de despacho por capacitación). El examen real los inserta con la llave de servicio tras calificar.
drop policy if exists capacitacion_evaluation_attempts_insert on public.capacitacion_evaluation_attempts;

-- 4) Contadores: horas negativas reiniciaban el contador de la aeronave y ocultaban un mantenimiento vencido.
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

  if not exists (
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

  if not exists (
    select 1 from batteries
    where id = p_id
      and organization_id in (select v2_current_organization_ids())
  ) then
    raise exception 'Sin membresía activa en la organización de esta batería';
  end if;

  update batteries set cycles = cycles + p_cycles where id = p_id;
end;
$function$;
