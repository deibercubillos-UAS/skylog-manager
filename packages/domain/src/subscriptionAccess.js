// subscriptionAccess — qué pasa cuando un plan vence y no se renueva (decisión del usuario, 2026-10-16): tras 7 días de
// gracia la organización queda en SOLO LECTURA hasta que pague. Enterprise queda fuera (se gestiona a mano por contrato).
// Lo que se puede seguir haciendo en solo lectura está en READ_ONLY_ALLOWED: pagar, la propia cuenta y datos personales
// (Ley 1581), y lo que no se puede bloquear por seguridad (reportar sucesos, cerrar un vuelo ya en el aire).

export const READ_ONLY_GRACE_DAYS = 7;

/** Funciones de la matriz de permisos que siguen disponibles con la organización en solo lectura. */
export const READ_ONLY_ALLOWED = new Set([
  'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', // cuenta y acceso
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', // mi perfil, descargar mis datos, eliminar mi cuenta
  'C5', // mis notificaciones
  'F4', // cerrar un vuelo ya despachado (puede estar en el aire)
  'I11', // reportar un evento inesperado (seguridad)
  'U1', 'U8', // reportar un suceso SMS y adjuntar evidencias
  'AA2', // confirmar lectura de un manual
  'AE1', 'AE2', 'AE3', 'AE4', 'AE5', // suscripción: ver, cambiar de plan, pagar, cancelar, historial
]);

/**
 * ¿La organización está en solo lectura por plan vencido? Solo si el plan tiene vencimiento, no es Enterprise y pasaron
 * más de 7 días desde que venció.
 */
export function isOrgReadOnly({ plan, expiresAt, today = new Date() }) {
  if (!expiresAt || plan === 'enterprise') return false;
  const expiry = Date.parse(`${String(expiresAt).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(expiry)) return false;
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return now - expiry > READ_ONLY_GRACE_DAYS * 86400000;
}

/** Fecha (AAAA-MM-DD) desde la que la organización queda en solo lectura si no paga. */
export function readOnlyFromDate(expiresAt) {
  if (!expiresAt) return null;
  const d = new Date(`${String(expiresAt).slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + READ_ONLY_GRACE_DAYS + 1);
  return d.toISOString().slice(0, 10);
}

/** ¿Alguna membresía activa de la persona en esa organización está en solo lectura? */
export function membershipIsReadOnly(memberships, organizationId) {
  return (memberships || []).some((m) => m.organization_id === organizationId && m.readOnly);
}
