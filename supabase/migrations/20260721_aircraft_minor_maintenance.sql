-- Mantenimiento Menor: chequeo periódico ligero que realizan los PILOTOS
-- (no un técnico), con periodicidad configurable por la organización por
-- aeronave (horas de vuelo Y días calendario, igual patrón que el
-- mantenimiento mayor — vence por lo que ocurra primero). Ver CLAUDE.md.
--
-- Opt-in por aeronave: los 2 intervalos nacen en 0 (deshabilitado) para no
-- bloquear de golpe el despacho de flotas existentes — cada organización
-- activa el que quiera configurando un intervalo > 0 en Flota.

alter table public.aircraft
  add column if not exists minor_maintenance_interval_hours numeric not null default 0,
  add column if not exists minor_maintenance_interval_days int not null default 0,
  add column if not exists last_minor_maintenance_date date,
  add column if not exists last_minor_maintenance_hours numeric,
  add column if not exists minor_maintenance_due boolean not null default false;

-- El registro queda dentro de Mantenimiento (maintenance_logs), con
-- maintenance_type = 'MENOR' — se lista junto al resto de intervenciones,
-- sin tabla nueva. minor_checklist es análogo a return_checklist (objeto
-- compacto { field_number: bool }, texto real vive en form_definitions).
alter table public.maintenance_logs
  add column if not exists minor_checklist jsonb;

-- Nuevo tipo de notificación para la campana + correo del cron de abajo.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type = any (array[
    'flight_scheduled', 'flight_dispatched', 'manual_published', 'drone_alert',
    'maintenance_due', 'invitation', 'document_updated', 'vor_mor', 'announcement',
    'system', 'aerocivil_report_due', 'training_exam_due', 'spi_report_due',
    'vormor_deadline_due', 'minor_maintenance_due'
  ]));

-- Función cron: evalúa aeronaves y marca minor_maintenance_due = true al
-- superar el umbral — mismo patrón que check_aircraft_maintenance_due(),
-- pero SIN tocar operational_status (es una alerta distinta, más liviana,
-- que no requiere intervención de un técnico) y notificando también a
-- pilotos (quienes deben ejecutar el checklist), no solo a GG+JP.
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
      '/dashboard/minor-maintenance',
      jsonb_build_object('aircraft_id', rec.id)
    from public.profiles p
    where
      p.organization_id = rec.organization_id
      and p.role in ('admin', 'jefe_pilotos', 'piloto', 'superadmin');

  end loop;
end;
$$;

revoke execute on function public.check_aircraft_minor_maintenance_due() from public, anon, authenticated;

select cron.schedule(
  'check_aircraft_minor_maintenance_due',
  '35 13 * * *',
  $$select public.check_aircraft_minor_maintenance_due();$$
);
