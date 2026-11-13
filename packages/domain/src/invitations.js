// invitations — invitación de tripulantes por correo (Etapa C de `44-alta-y-socios.md`). Lógica pura, con tests
// (regla Q2): quién puede invitar a qué rol, validación del correo y estado de una invitación.

export const INVITE_ROLES = ['piloto', 'jefe_pilotos', 'gerente_sms', 'admin'];
export const INVITE_ROLE_LABELS = { piloto: 'Piloto', jefe_pilotos: 'Jefe de Pilotos', gerente_sms: 'Gerente SMS', admin: 'Gerente General' };
export const INVITATION_TTL_DAYS = 7;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Solo un Gerente General (o el superadmin) invita a otro Gerente General; el Jefe de Pilotos invita al resto (K7); el Gerente SMS no invita. */
export function canInviteRole(inviterRoles, role) {
  if (!INVITE_ROLES.includes(role)) return false;
  if (role === 'admin') return (inviterRoles || []).some((r) => r === 'admin' || r === 'superadmin');
  return (inviterRoles || []).some((r) => ['admin', 'superadmin', 'jefe_pilotos'].includes(r));
}

export function validateInvitation({ email, role, name }) {
  const errors = [];
  const clean = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) errors.push('Escribe un correo válido.');
  if (!INVITE_ROLES.includes(role)) errors.push('Elige un rol válido.');
  if (String(name || '').length > 150) errors.push('El nombre es demasiado largo.');
  return { ok: errors.length === 0, errors, clean: { email: clean, role, name: String(name || '').trim() || null } };
}

/** 'usable' | 'expirada' | 'usada' | 'revocada' — la expiración se evalúa al consultar, no con un cron. */
export function invitationState(inv, nowMs) {
  if (!inv) return 'inexistente';
  if (inv.status === 'aceptada') return 'usada';
  if (inv.status === 'revocada') return 'revocada';
  if (inv.status === 'expirada' || Date.parse(inv.expires_at) < nowMs) return 'expirada';
  return 'usable';
}

export const INVITATION_STATE_MESSAGES = {
  inexistente: 'Este enlace de invitación no existe.',
  usada: 'Esta invitación ya fue aceptada.',
  revocada: 'Esta invitación fue cancelada por quien la envió.',
  expirada: 'Esta invitación venció. Pide que te envíen una nueva.',
};

export function invitationExpiresAt(nowIso, days = INVITATION_TTL_DAYS) {
  return new Date(Date.parse(nowIso) + days * 86_400_000).toISOString();
}

// Límites de envío (auditoría 2026-11-12): `POST /api/invitaciones` manda un correo desde el dominio de Skylog a una
// dirección ajena; sin tope servía para spam y para dañar la reputación del remitente. Se cuentan las invitaciones ya
// guardadas (incluidas las revocadas por reinvitar), así que el límite vale entre instancias del servidor.
export const INVITATION_LIMITS = {
  perInviterPerHour: 20,
  perOrganizationPerDay: 50,
  perRecipientPerDay: 5, // a un mismo correo, desde cualquier organización
};

/**
 * `counts`: invitaciones creadas en la ventana — por quien invita (última hora), por la organización (últimas 24 h) y
 * hacia ese correo (últimas 24 h). Devuelve { ok: true } o { ok: false, reason, message }.
 */
export function checkInvitationQuota({ byInviterLastHour = 0, byOrganizationLastDay = 0, byRecipientLastDay = 0 } = {}, limits = INVITATION_LIMITS) {
  if (byRecipientLastDay >= limits.perRecipientPerDay) {
    return { ok: false, reason: 'recipient', message: 'Ya se enviaron varias invitaciones a ese correo en las últimas 24 horas. Espera antes de reenviar.' };
  }
  if (byInviterLastHour >= limits.perInviterPerHour) {
    return { ok: false, reason: 'inviter', message: 'Enviaste demasiadas invitaciones en la última hora. Intenta de nuevo más tarde.' };
  }
  if (byOrganizationLastDay >= limits.perOrganizationPerDay) {
    return { ok: false, reason: 'organization', message: 'Tu organización alcanzó el máximo de invitaciones por día. Intenta de nuevo mañana.' };
  }
  return { ok: true };
}
