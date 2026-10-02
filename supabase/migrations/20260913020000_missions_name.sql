-- Skylog V2.0 — Programación (Operación). `missions` gana `name` (nombre de
-- la misión, editable) — pedido explícito del usuario. Sin filas todavía
-- (tabla nueva, 0 registros verificado antes de esta migración), por eso
-- `not null` directo sin backfill.

alter table missions add column name text not null;

comment on column missions.name is 'Nombre de la misión, asignado al programarla y editable después (solo por un gestor, misma política de UPDATE que el resto de la fila).';
