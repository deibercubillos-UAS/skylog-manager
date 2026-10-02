-- Skylog V2.0 — Replay GPS (Operación/Bitácora). Traza decimada del vuelo
-- para el visor de replay, SOLO cuando el vuelo se confirmó desde un log DJI
-- importado (import-dji) — nunca para vuelos cargados a mano, que no tienen
-- de dónde sacar una traza real.
--
-- Simplificación deliberada frente a v1: v1 guarda la traza comprimida
-- (gzip) en un bucket R2 aparte (`flight-replays`) porque el parseo ocurre
-- en el navegador (WASM) y el archivo puede pesar varios MB sin decimar. En
-- V2 el log ya se parsea server-side con DJI_API_KEY (lib/djiParser.js,
-- `_frames`) y la traza se decima a ~400 puntos antes de guardarse — cabe
-- cómodo como jsonb inline en la fila, sin bucket ni gzip. Revisar si el
-- volumen real de vuelos/org lo justifica más adelante.
alter table flights add column if not exists replay_track jsonb;

comment on column flights.replay_track is
  'Traza GPS decimada para el replay: array de {t,lat,lng,alt,speed,yaw,battery}. Solo presente en vuelos confirmados desde un log DJI importado (ver /api/flights/import-dji + POST /api/flights). Nunca se recalcula ni se completa a mano.';
