-- El checklist de Mantenimiento Menor se reubicó: ya no vive en una página
-- propia (/dashboard/minor-maintenance, eliminada) — se edita en Protocolos y
-- se diligencia dentro de /dashboard/maintenance. Corrige el link de la
-- notificación del cron para que apunte a la ruta real.
create or replace function public.check_aircraft_minor_maintenance_due()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec RECORD;
begin
  for rec in
    select
      a.id,
      a.organization_id,
      a.model,
      a.serial_number
    from public.aircraft a
    where
      a.status is distinct from 'Baja'
      and a.status is distinct from 'Transferido'
      and a.operational_status = 'disponible'
      and a.minor_maintenance_due = false
      and (
        (a.minor_maintenance_interval_hours > 0 and (a.total_hours - coalesce(a.last_minor_maintenance_hours, 0)) >= a.minor_maintenance_interval_hours)
        or
        (a.minor_maintenance_interval_days > 0 and a.last_minor_maintenance_date is not null
          and (current_date - a.last_minor_maintenance_date::date) >= a.minor_maintenance_interval_days)
      )
  loop
    update public.aircraft
    set minor_maintenance_due = true
    where id = rec.id;

    insert into public.notifications (
      organization_id, profile_id, type, title, body, link, metadata
    )
    select
      p.organization_id,
      p.id,
      'minor_maintenance_due',
      'Mantenimiento menor pendiente: ' || rec.model,
      'La aeronave ' || coalesce(rec.serial_number, rec.model) || ' requiere el checklist de mantenimiento menor antes de volver a volar.',
      '/dashboard/maintenance',
      jsonb_build_object('aircraft_id', rec.id)
    from public.profiles p
    where
      p.organization_id = rec.organization_id
      and p.role in ('admin', 'jefe_pilotos', 'piloto', 'superadmin');

  end loop;
end;
$$;
