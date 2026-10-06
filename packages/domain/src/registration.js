// registration — reglas del alta de un explotador nuevo (Etapa A de `44-alta-y-socios.md`). Lógica pura, con tests
// (regla Q2): el servidor y la pantalla validan con las MISMAS funciones.

export const REGISTRATION_MIN_PASSWORD = 8;

/** NIT sin espacios, guiones ni puntos y en mayúsculas — la misma normalización de v1 para buscar por NIT. */
export function normalizeNit(value) {
  return String(value || '').replace(/[\s\-.]/g, '').toUpperCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Contraseña: mínimo 8 caracteres, al menos una letra y un número. */
export function passwordProblem(password) {
  const p = String(password || '');
  if (p.length < REGISTRATION_MIN_PASSWORD) return `La contraseña debe tener al menos ${REGISTRATION_MIN_PASSWORD} caracteres.`;
  if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(p) || !/\d/.test(p)) return 'La contraseña debe combinar letras y números.';
  return null;
}

/**
 * Valida el formulario de registro de un explotador. Devuelve { ok, errors, clean } donde `clean` trae los
 * valores normalizados que se deben usar (correo en minúsculas, NIT normalizado, nombre completo armado).
 */
export function validateRegistration(input) {
  const errors = [];
  const firstName = String(input?.firstName || '').trim();
  const lastName = String(input?.lastName || '').trim();
  const email = String(input?.email || '').trim().toLowerCase();
  const companyName = String(input?.companyName || '').trim();
  const nit = normalizeNit(input?.nit);
  const phone = String(input?.phone || '').trim();

  if (firstName.length < 2) errors.push('Escribe tu nombre.');
  if (lastName.length < 2) errors.push('Escribe tus apellidos.');
  if (!EMAIL_RE.test(email)) errors.push('Escribe un correo válido.');
  const pw = passwordProblem(input?.password);
  if (pw) errors.push(pw);
  if (companyName.length < 2) errors.push('Escribe el nombre de la empresa u organización.');
  if (companyName.length > 150) errors.push('El nombre de la empresa es demasiado largo (máximo 150 caracteres).');
  if (!/^[A-Z0-9]{5,20}$/.test(nit)) errors.push('Escribe un NIT o documento válido (entre 5 y 20 caracteres).');
  if (phone && !/^[0-9+()\s-]{7,20}$/.test(phone)) errors.push('El teléfono no es válido.');
  if (input?.acceptedTerms !== true) errors.push('Debes aceptar los términos y la política de privacidad.');

  return {
    ok: errors.length === 0,
    errors,
    clean: { email, firstName, lastName, fullName: `${firstName} ${lastName}`.trim(), companyName, nit, nitType: String(input?.nitType || '').trim().slice(0, 20) || null, phone: phone || null },
  };
}

/** Fecha (ISO) en que termina la prueba gratuita, `days` días después de `nowIso`. */
export function trialEndsAt(nowIso, days) {
  return new Date(Date.parse(nowIso) + days * 86_400_000).toISOString();
}
