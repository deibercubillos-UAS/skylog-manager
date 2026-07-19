-- Mejora: invitaciones (organización/Master/socio) sin fricción de pago +
-- ventana de bienvenida ("invitado por / plan / hasta fecha") + aviso previo
-- al vencimiento del acceso gratuito (5 días antes). Ver CLAUDE.md.
--
-- `welcome_shown_at` en ambas tablas marca cuándo ya se le mostró al usuario
-- la ventana de bienvenida, para que aparezca UNA sola vez. Se agrega en
-- `invitations` (cubre invitación de organización + invitación de Master con
-- organización, ambas escriben esta misma tabla) y en `free_grants` (cubre
-- regalo de socio + el nuevo regalo de Master sin organización, ver abajo).

alter table public.invitations
  add column if not exists welcome_shown_at timestamptz;

alter table public.free_grants
  add column if not exists welcome_shown_at timestamptz;

-- Backfill: las filas YA resueltas antes de esta migración no deben disparar
-- la ventana de bienvenida retroactivamente (el usuario ya lleva tiempo
-- usando la plataforma) — solo las invitaciones/regalos nuevos, creados
-- después de este cambio, deben nacer con welcome_shown_at NULL.
update public.invitations
  set welcome_shown_at = coalesce(accepted_at, now())
  where status in ('accepted', 'creado_manualmente')
    and welcome_shown_at is null;

update public.free_grants
  set welcome_shown_at = now()
  where status <> 'enviado'
    and welcome_shown_at is null;

-- Nuevo tipo de notificación para el cron de aviso previo al vencimiento
-- (grant-expiring-reminder) — campana + correo, 5 días antes de expires_at.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type = any (array[
    'flight_scheduled', 'flight_dispatched', 'manual_published', 'drone_alert',
    'maintenance_due', 'invitation', 'document_updated', 'vor_mor', 'announcement',
    'system', 'aerocivil_report_due', 'training_exam_due', 'spi_report_due',
    'vormor_deadline_due', 'minor_maintenance_due', 'grant_expiring_soon'
  ]));
