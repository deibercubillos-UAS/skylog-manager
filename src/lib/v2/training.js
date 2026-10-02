// Skylog V2.0 — Capacitación, las 3 pistas independientes (decisión del
// usuario, 2026-09-13): cada una es un examen propio (training_exams.type,
// migración 20260913030000_training_exam_tracks.sql). Fuente única del
// vocabulario — nunca hardcodear estos 3 valores sueltos en otro archivo.
export const TRAINING_TYPES = ['operaciones', 'mantenimiento', 'seguridad_operacional'];

export const TRAINING_TYPE_LABELS = {
  operaciones: 'Operacional',
  mantenimiento: 'Mantenimiento',
  seguridad_operacional: 'Seguridad Operacional',
};
