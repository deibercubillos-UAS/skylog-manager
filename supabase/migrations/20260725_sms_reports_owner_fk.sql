-- Fix: GET /api/safety/case?source=sms devolvía 404 "Caso no encontrado" para
-- CUALQUIER reporte SMS. El SELECT embebido owner:owner_id(full_name) en
-- src/app/api/safety/case/route.js necesita que PostgREST conozca la relación
-- sms_reports.owner_id -> profiles(id) vía foreign key para poder embeber
-- `full_name`. La FK real apuntaba a auth.users(id) (ON DELETE CASCADE) — una
-- tabla sin `full_name` y fuera del schema expuesto por PostgREST — así que el
-- embed fallaba con error de esquema y el catch genérico lo mapeaba a 404,
-- bloqueando por completo el seguimiento de casos SMS (detalle, línea de
-- tiempo, acciones correctivas) para todos los reportes SMS. Encontrado en
-- Fase 9 del plan de QA (2026-07-25).
--
-- owner_id se escribe siempre como auth.uid() (= profiles.id, mismo PK), así
-- que redirigir la FK a profiles es seguro y no requiere backfill. ON DELETE
-- SET NULL: mismo patrón ya aplicado a las columnas de autoría apuntando a
-- profiles en la auditoría de 2026-07-14 (fila histórica se conserva, solo
-- pierde la referencia al autor si la cuenta se elimina) — CASCADE habría
-- borrado el reporte SMS entero al eliminar la cuenta del reportante.
ALTER TABLE sms_reports DROP CONSTRAINT sms_reports_owner_id_fkey;

ALTER TABLE sms_reports
  ADD CONSTRAINT sms_reports_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE SET NULL;
