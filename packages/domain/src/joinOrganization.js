// joinOrganization — unirse a una organización existente por NIT (Etapa B de `44-alta-y-socios.md`). Lógica pura,
// con tests (regla Q2): la misma decisión la usan la consulta previa, el alta y el servidor.
import { normalizeNit, passwordProblem } from './registration.js';

export const JOINABLE_ROLES = ['piloto', 'jefe_pilotos', 'gerente_sms'];
// Cargos de uno solo por organización (el Gerente General no se pide al unirse: es quien creó la organización).
export const UNIQUE_JOIN_ROLES = ['jefe_pilotos', 'gerente_sms'];
export const JOIN_ROLE_LABELS = { piloto: 'Piloto', jefe_pilotos: 'Jefe de Pilotos', gerente_sms: 'Gerente SMS' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * ¿Puede alguien entrar con este rol? `members` son las membresías ACTIVAS de la organización ({ role });
 * `crewLimit` es el tope del plan (null = sin tope) y `crewCount` cuántos tripulantes cuentan hoy (el Gerente
 * General no cuenta). Devuelve { ok, reason, message }.
 */
export function evaluateJoin({ role, members = [], crewLimit = null, crewCount = 0 }) {
  if (!JOINABLE_ROLES.includes(role)) return { ok: false, reason: 'rol_invalido', message: 'Elige un rol válido para unirte.' };
  if (UNIQUE_JOIN_ROLES.includes(role) && members.some((m) => m.role === role)) {
    return { ok: false, reason: 'rol_ocupado', message: `El cargo de ${JOIN_ROLE_LABELS[role]} ya está ocupado en esta organización.` };
  }
  if (crewLimit !== null && crewLimit !== undefined && crewCount >= crewLimit) {
    return { ok: false, reason: 'limite_plan', message: `La organización alcanzó el límite de tripulantes de su plan (${crewLimit}). Pídele a su gerente que amplíe el plan.` };
  }
  return { ok: true, reason: null, message: null };
}

/** Formulario de «unirme a una empresa» con una cuenta NUEVA (sin empresa propia). */
export function validateJoinRegistration(input) {
  const errors = [];
  const firstName = String(input?.firstName || '').trim();
  const lastName = String(input?.lastName || '').trim();
  const email = String(input?.email || '').trim().toLowerCase();
  const nit = normalizeNit(input?.nit);
  const phone = String(input?.phone || '').trim();
  const role = input?.role;

  if (firstName.length < 2) errors.push('Escribe tu nombre.');
  if (lastName.length < 2) errors.push('Escribe tus apellidos.');
  if (!EMAIL_RE.test(email)) errors.push('Escribe un correo válido.');
  const pw = passwordProblem(input?.password);
  if (pw) errors.push(pw);
  if (!/^[A-Z0-9]{5,20}$/.test(nit)) errors.push('Escribe el NIT de la organización a la que te unes.');
  if (!JOINABLE_ROLES.includes(role)) errors.push('Elige tu rol.');
  if (phone && !/^[0-9+()\s-]{7,20}$/.test(phone)) errors.push('El teléfono no es válido.');
  if (input?.acceptedTerms !== true) errors.push('Debes aceptar los términos y la política de privacidad.');

  return { ok: errors.length === 0, errors, clean: { email, firstName, lastName, fullName: `${firstName} ${lastName}`.trim(), nit, role, phone: phone || null } };
}
