-- Skylog V2.0 — ficha técnica de la aeronave, RAC 100 Apéndice 1 Parte B (26 atributos).
-- Faltaban: tipo de carga útil, dimensiones, tipo de despegue/aterrizaje, batería o sistema equivalente
-- (en el MODELO) y el peso real de la unidad (en la AERONAVE).
alter table aircraft_models
  add column payload_type text,
  add column length_m numeric check (length_m is null or length_m > 0),
  add column width_m numeric check (width_m is null or width_m > 0),
  add column diagonal_m numeric check (diagonal_m is null or diagonal_m > 0),
  add column takeoff_landing_type text check (takeoff_landing_type is null or takeoff_landing_type in ('VTOL','CTOL','STOL','HTOL','lanzamiento','catapulta')),
  add column battery_system text;
alter table aircraft add column actual_weight_kg numeric check (actual_weight_kg is null or actual_weight_kg > 0);
comment on column aircraft.actual_weight_kg is 'Peso real de la unidad (kg) — Apéndice 1 Parte B pide peso real, que puede diferir del MTOW del modelo.';
