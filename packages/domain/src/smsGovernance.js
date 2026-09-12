// smsGovernance — Fase 1 del asistente de implantación SMS: perfil del
// Gerente de Seguridad Operacional (GSO). Un explotador UAS debe cumplir
// AMBAS normas a la vez — RAC 100 §100.545(d) y MAUT-1.0-22-007 §7.2.3, que
// NO son idénticas (16-asuntos-complementarios.md §3) — la unión de los dos
// perfiles, no uno solo (pendiente P-007-1 del documento fuente, resuelto
// aquí como una sola función de validación). Lógica pura, con tests (regla Q2).

/**
 * Los 5 criterios reales que deben cumplirse — 4 comunes/exigidos por al
 * menos una norma, más `oneYearAviationAdminExperience` que es EXCLUSIVO de
 * RAC 100 §100.545(d) (no aparece en la directiva MAUT, que en cambio pide
 * experiencia operacional relativa a la naturaleza de la organización, más
 * general — se exige igual porque ambas normas aplican a la vez).
 */
export const GSO_PROFILE_REQUIREMENTS = [
  { key: 'accreditedTraining', label: 'Formación acreditada en áreas del sector aeronáutico (RAC 100 §100.545(d) / MAUT §7.2.3)' },
  { key: 'operationalExperienceRelevant', label: 'Experiencia operacional acreditada respecto de las funciones y naturaleza de la organización (MAUT §7.2.3)' },
  { key: 'oneYearAviationAdminExperience', label: '≥1 año de experiencia administrativa en aviación tripulada (RAC 100 §100.545(d))' },
  { key: 'smsAdvancedCourseCertified', label: 'Curso aprobado y certificado, avanzado, específico en gestión de la seguridad operacional (ambas normas)' },
  { key: 'projectManagementTraining', label: 'Formación en gestión o gerencia de proyectos (MAUT §7.2.3)' },
];

/**
 * Valida el perfil de un candidato a GSO contra los 5 criterios reales.
 * `profile` es un objeto con cada `key` de GSO_PROFILE_REQUIREMENTS en true/false.
 */
export function validateGsoProfile(profile) {
  const missing = GSO_PROFILE_REQUIREMENTS.filter((r) => !profile?.[r.key]);
  return { eligible: missing.length === 0, missing };
}
