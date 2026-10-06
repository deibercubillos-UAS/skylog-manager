// smsReporterConfidentiality — SMS-H: control real de quién ve la identidad
// del notificante (RAC 219 §219.115-140, regla S4 — distinto de Cultura
// Justa, ver 17-implementacion-sms-uas.md §3). Postgres RLS filtra FILAS,
// no columnas: un Jefe de Pilotos o un admin ya pasan la política de
// `sms_reports_select` (son `v2_is_duty_manager`) y verían `reported_by` sin
// este filtro adicional en la capa de API. Lógica pura, con tests (regla Q2)
// — security-relevant, se verifica igual que cualquier otra regla real.

/**
 * `isReporter`: el viewer ES quien reportó (siempre ve su propio reporte).
 * `viewerRole`: el rol del viewer en la organización (membership.role).
 * `confidentialityLevel`: 'normal' | 'confidencial'.
 * Devuelve true si el viewer puede ver la identidad real del notificante.
 */
export function canViewReporterIdentity({ confidentialityLevel, viewerRole, isReporter }) {
  if (isReporter) return true;
  if (confidentialityLevel !== 'confidencial') return true;
  return viewerRole === 'gerente_sms' || viewerRole === 'superadmin';
}

/**
 * Aplica la regla a una fila de `sms_reports` (u objeto compatible con
 * `reported_by` + opcionalmente un campo `reporter` ya embebido por join) —
 * nunca muta el original, devuelve una copia con la identidad redactada si
 * corresponde. `reporterFields` lista las claves a redactar además de
 * `reported_by` (p. ej. `['reporter']` para un join `reporter:reported_by(...)`).
 */
export function redactReporterIdentity(row, { viewerRole, viewerPersonId, reporterFields = ['reporter'] } = {}) {
  const isReporter = row.reported_by === viewerPersonId;
  const canView = canViewReporterIdentity({ confidentialityLevel: row.confidentiality_level, viewerRole, isReporter });
  if (canView) return { ...row, identity_redacted: false };

  // `reporter_contact` (reporte público sin cuenta) ES identidad del notificante igual que `reported_by`.
  const redacted = { ...row, reported_by: null, identity_redacted: true };
  if ('reporter_contact' in redacted) redacted.reporter_contact = null;
  for (const field of reporterFields) {
    if (field in redacted) redacted[field] = null;
  }
  return redacted;
}
