-- Skylog V2.0 — Salida de zona (Operación/Bitácora/SMS). Un vuelo puede llevar la geometría de su
-- zona de operación; al cargarlo, el servidor evalúa su traza GPS real contra esa zona y, si el
-- dron se salió, pide al piloto un reporte con los motivos y avisa al Gerente SMS para que
-- verifique y haga seguimiento del caso (decisión del usuario, 2026-11-22; ver 40-sms.md, regla S).
--
-- Decisiones del usuario: (1) la zona vive en el VUELO (no solo en la misión), y se precarga desde
-- la misión cuando el vuelo viene de Despacho; (2) una salida solo cuenta si el dron queda fuera del
-- perímetro por más de un MARGEN horizontal y de forma SOSTENIDA — ambos configurables por la
-- organización (dato interno configurable, regla C), con valores por defecto 15 m y 3 s.
--
-- Aditiva. `flights` sigue siendo clase ④ (evento): estas columnas las escribe SOLO el servidor con
-- la llave de servicio tras la evaluación, nunca el cliente; no se añade política de UPDATE.

-- 1) Geometría de zona y resultado de la evaluación en el vuelo.
alter table flights add column if not exists zone_geo jsonb;
alter table flights add column if not exists zone_excursion jsonb;
alter table flights add column if not exists zone_report_status text
  check (zone_report_status is null or zone_report_status in ('pendiente', 'enviado'));

comment on column flights.zone_geo is
  'Zona de operación del vuelo: { geoType: polygon|linear|circle, points:[{lat,lng}], radius }. Mismo formato que missions.zone_geo. Nullable (sin zona = no se evalúa salida).';
comment on column flights.zone_excursion is
  'Resultado de evaluateZoneExcursion (packages/domain/zoneExcursion.js): { applicable, outside, maxExceedM, segments, params, ... }. Solo lo escribe el servidor al cargar un vuelo con traza GPS y zona.';
comment on column flights.zone_report_status is
  'Estado del reporte de motivos que se le pide al piloto cuando hubo salida de zona: pendiente | enviado. Null = no se requiere.';

-- Índice parcial: listar rápido los vuelos con salida pendiente de reporte.
create index if not exists flights_zone_report_pending_idx
  on flights (organization_id)
  where zone_report_status = 'pendiente';

-- 2) Umbrales configurables por organización (regla C).
alter table organizations add column if not exists zone_excursion_margin_m integer not null default 15
  check (zone_excursion_margin_m >= 0 and zone_excursion_margin_m <= 1000);
alter table organizations add column if not exists zone_excursion_min_duration_s integer not null default 3
  check (zone_excursion_min_duration_s >= 0 and zone_excursion_min_duration_s <= 600);

comment on column organizations.zone_excursion_margin_m is
  'Margen horizontal (m) que el dron debe superar fuera del perímetro para que cuente como salida de zona. Absorbe el ruido de GPS.';
comment on column organizations.zone_excursion_min_duration_s is
  'Tiempo (s) que la salida debe sostenerse para que cuente. Evita falsos positivos por saltos puntuales de la señal.';

-- 3) Nuevo origen de reporte SMS automático: salida de zona.
alter table sms_reports drop constraint if exists sms_reports_source_check;
alter table sms_reports
  add constraint sms_reports_source_check
  check (source in ('manual', 'public', 'auto_duty_exception', 'auto_unexpected_event', 'auto_training_exam_failed', 'auto_zone_excursion'));

-- 4) Nuevo tipo de notificación: salida de zona (al piloto para que reporte, y al Gerente SMS).
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications
  add constraint notifications_type_check
  check (type in ('mision_programada', 'manual_publicado', 'miembro_nuevo', 'sms_reporte', 'sms_caso_asignado', 'sms_plazo', 'custodia_abierta', 'vencimiento', 'anuncio', 'sistema', 'zona_excursion'));
