-- Skylog V2.0 — Capacitación pasa de una sola pista (una fila por
-- organización) a 3 pistas independientes: Operacional, Mantenimiento,
-- Seguridad Operacional — cada una con su propio examen, banco de preguntas
-- e intentos. Decisión del usuario, 2026-09-13. Sin filas en ninguna de las
-- 3 tablas (verificado antes de escribir esta migración) — sin backfill.

alter table training_exams drop constraint training_exams_pkey;
alter table training_exams add column type text not null default 'operaciones';
alter table training_exams add constraint training_exams_type_check check (type in ('operaciones', 'mantenimiento', 'seguridad_operacional'));
alter table training_exams alter column type drop default;
alter table training_exams add constraint training_exams_pkey primary key (organization_id, type);

alter table training_exam_questions add column type text not null default 'operaciones';
alter table training_exam_questions add constraint training_exam_questions_type_check check (type in ('operaciones', 'mantenimiento', 'seguridad_operacional'));
alter table training_exam_questions alter column type drop default;

alter table training_exam_attempts add column type text not null default 'operaciones';
alter table training_exam_attempts add constraint training_exam_attempts_type_check check (type in ('operaciones', 'mantenimiento', 'seguridad_operacional'));
alter table training_exam_attempts alter column type drop default;
alter table training_exam_attempts drop constraint training_exam_attempts_person_id_cycle_start_attempt_number_key;
alter table training_exam_attempts add constraint training_exam_attempts_unique unique (person_id, type, cycle_start, attempt_number);

comment on column training_exams.type is 'Pista de capacitación: operaciones / mantenimiento / seguridad_operacional — cada una es un examen independiente.';
comment on column training_exam_questions.type is 'Pista a la que pertenece esta pregunta — el banco de preguntas es independiente por pista.';
comment on column training_exam_attempts.type is 'Pista del examen presentado en este intento.';
