-- Skylog V2.0 — nuevo tipo de notificación: recordatorio de vuelo (al PIC y al observador,
-- ~15 minutos antes de la hora programada de la misión). Lo dispara el cron
-- /api/cron/mission-reminders; en la app aparece en la campana como los demás avisos.
-- Migración aditiva: solo amplía el CHECK de `notifications.type` (mismo patrón que
-- 20261122000000_v2_flights_zone_excursion.sql).
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications
  add constraint notifications_type_check
  check (type in ('mision_programada', 'mision_recordatorio', 'manual_publicado', 'miembro_nuevo', 'sms_reporte', 'sms_caso_asignado', 'sms_plazo', 'custodia_abierta', 'vencimiento', 'anuncio', 'sistema', 'zona_excursion'));
