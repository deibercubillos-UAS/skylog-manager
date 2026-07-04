/**
 * missionTypes.js
 *
 * Categorías oficiales de "Tipo de operación ejecutada" exigidas por la
 * circular de AeroCivil (Radicado 2026351070026944, Solicitud de Información
 * Operacional UAS 2026) — reemplazan las 9 categorías libres que usaba
 * BitaFly antes (migración de datos histórica en
 * supabase/migrations/20260704_aerocivil_monthly_report.sql).
 *
 * Fuente única — usado en Programación (BasicForm), Despacho (logbook/new) y
 * el reporte mensual AeroCivil (lib/reportGenerators.js).
 */
export const MISSION_TYPES = [
  'Captura imágenes/datos',
  'Captura imágenes/datos - Vigilancia y seguridad',
  'Captura imágenes/datos - Medios de comunicación',
  'Aspersión',
  'Dispersión',
  'Enjambre',
  'Drone Delivery',
  'Entidades públicas',
  'Instrucción',
  "Apoyo atención calamidad pública, desastre, emergencia (PMU's, medios de comunicación)",
];

// "Tipo de Línea de Vista" — tampoco existía en el esquema antes de esta circular.
export const LINE_OF_SIGHT_TYPES = ['VLOS', 'EVLOS', 'BVLOS'];
