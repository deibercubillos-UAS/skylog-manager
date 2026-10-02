-- Skylog V2.0 — Programación (Operación). `missions` gana `zone_geo` para la
-- geometría real de la zona de operación (marcada en el mapa o cargada desde
-- un KMZ), aditiva sobre la migración 20260913000000_missions_minimal.sql.
-- `zone` (texto) se conserva como descripción legible/etiqueta — no se
-- reemplaza, mismo criterio ya usado en v1 (`flight_authorizations.plan_data`
-- guarda geometría aparte del texto de la misión).
--
-- Forma: { geoType: 'polygon'|'linear'|'circle', points: [{lat,lng}, ...],
-- radius: number|null } — mismo vocabulario que ya usa
-- src/lib/flightPlanDocs.js (GEO_TYPES) y MapPickerModal.js en v1, para poder
-- reutilizar esos mismos componentes/utilidades sin traducir formatos.

alter table missions add column zone_geo jsonb;

comment on column missions.zone_geo is 'Geometría real de la zona de operación: { geoType, points: [{lat,lng}], radius }. Nullable — una misión puede programarse solo con la descripción de texto en `zone`, sin geometría todavía.';
