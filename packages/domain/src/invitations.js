// invitations — invitación de tripulantes por correo (Etapa C de `44-alta-y-socios.md`). Lógica pura, con tests
// (regla Q2): quién puede invitar a qué rol, validación del correo y estado de una invitación.

export const INVITE_ROLES = ['piloto', 'jefe_pilotos', 'gerente_sms', 'admin'];
export const INVITE_ROLE_LABELS = { piloto: 'Piloto', jefe_pilotos: 'Jefe de Pilotos', gerente_sms: 'Gerente SMS', admin: 'Gerente General' };
export const INVITATION_TTL_DAYS = 7;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Solo un Gerente General (o el superadmin) puede invitar a otro Gerente General; los demás gestores, el resto. */
export function canInviteRole(inviterRoles, role) {
  if (!INVITE_ROLES.includes(role)) return false;
  if (role === 'admin') return (inviterRoles || []).some((r) => r === 'admin' || r === 'superadmin');
  return (inviterRoles || []).some((r) => ['admin', 'superadmin', 'jefe_pilotos', 'gerente_sms'].includes(r));
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
