// supplierAuditScore — % de cumplimiento de una auditoría de proveedor,
// calculado sobre los criterios APLICABLES (excluye `no_aplica` del
// denominador, y también los criterios aún sin responder) — mismo criterio
// ya usado en producción para el checklist de auditoría de proveedores
// (v1, 2026-07-20). Lógica pura, con tests (regla Q2). Nunca se persiste
// como columna derivada — se recalcula siempre a partir de `responses`.
export function computeSupplierAuditScore(responses, criteriaIds) {
  const ids = criteriaIds || [];
  let compliant = 0;
  let nonCompliant = 0;
  let notApplicable = 0;
  let pending = 0;

  for (const id of ids) {
    const value = responses?.[id]?.value;
    if (value === 'cumple') compliant += 1;
    else if (value === 'no_cumple') nonCompliant += 1;
    else if (value === 'no_aplica') notApplicable += 1;
    else pending += 1;
  }

  const applicable = compliant + nonCompliant;
  const percentage = applicable > 0 ? Math.round((compliant / applicable) * 100) : null;

  return { compliant, nonCompliant, notApplicable, pending, applicable, total: ids.length, percentage };
}
