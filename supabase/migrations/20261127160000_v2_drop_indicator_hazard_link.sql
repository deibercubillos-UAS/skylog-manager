-- Skylog V2.0 — revierte el enlace KPI→peligro (20261127130000). Decisión del usuario
-- (2026-11-27): el KPI se vincula a los OBJETIVOS (Balanced Scorecard), no a los peligros.
-- Los peligros se gestionan con sus controles/barreras en la Matriz de peligros, sin KPI.
-- Al soltar la columna se elimina también su índice (safety_indicators_hazard_idx) y la FK.
alter table safety_indicators drop column if exists hazard_id;
