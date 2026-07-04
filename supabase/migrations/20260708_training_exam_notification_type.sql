-- Nuevo tipo de notificación para el recordatorio de examen de Capacitación
-- vencido/próximo a vencer (cron diario). Ver CLAUDE.md "Capacitación".
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'flight_scheduled', 'flight_dispatched', 'manual_published', 'drone_alert',
    'maintenance_due', 'invitation', 'document_updated', 'vor_mor', 'announcement',
    'system', 'aerocivil_report_due', 'training_exam_due'
  ]::text[]));
