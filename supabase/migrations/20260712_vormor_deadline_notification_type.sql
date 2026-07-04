-- Nuevo tipo de notificación para el recordatorio de plazo de radicación en
-- IRIS de reportes VOR/MOR (Fase 6 del plan de mejora SMS). Ver CLAUDE.md
-- "Seguridad SMS" / Reportes de Seguridad Operacional.
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'flight_scheduled', 'flight_dispatched', 'manual_published', 'drone_alert',
    'maintenance_due', 'invitation', 'document_updated', 'vor_mor', 'announcement',
    'system', 'aerocivil_report_due', 'training_exam_due', 'spi_report_due',
    'vormor_deadline_due'
  ]::text[]));
