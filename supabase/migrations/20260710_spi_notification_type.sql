-- Nuevo tipo de notificación para el recordatorio de envío anual de
-- Indicadores SPI a Aerocivil (vence 30 de marzo). Ver CLAUDE.md "Seguridad
-- SMS" / Indicadores (SPI).
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'flight_scheduled', 'flight_dispatched', 'manual_published', 'drone_alert',
    'maintenance_due', 'invitation', 'document_updated', 'vor_mor', 'announcement',
    'system', 'aerocivil_report_due', 'training_exam_due', 'spi_report_due'
  ]::text[]));
