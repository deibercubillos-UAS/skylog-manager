// partners — reglas del programa de socios (Etapa E de `44-alta-y-socios.md`): escuelas y asesores que regalan
// perfiles gratis y cobran comisión recurrente. Lógica pura, con tests (regla Q2): el servidor y las pantallas usan
// las MISMAS funciones.

export const PARTNER_TYPES = ['escuela', 'asesor'];
export const PARTNER_MEMBER_ROLES = ['owner', 'asesor'];
export const PARTNER_INVITATION_TTL_DAYS = 7;
export const GRANT_PURGE_DAYS = 90;
export const GRANT_REMINDER_DAYS = 5;

const MS_DAY = 86_400_000;

/** Código de venta: mayúsculas, espacios → guion, solo A-Z / 0-9 / guion. Vacío si no queda nada válido. */
export function normalizeCode(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos (0/O, 1/I)

/** Iniciales del nombre (máx. 4, sin acentos): «Escuela Águilas del Cielo» → «EADC». «BF» si no hay letras. */
export function codeInitials(name) {
  const letters = String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
  return letters || 'BF';
}

/** Candidato de código `INICIALES-XXXX`. `random` devuelve [0,1) — se inyecta para poder probarlo. */
export function codeCandidate(name, random = Math.random) {
  let suffix = '';
  for (let i = 0; i < 4; i++) suffix += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return `${codeInitials(name)}-${suffix}`;
}

/** Porcentaje que aplica a una venta: si vende un asesor de una escuela ACTIVA, el de la escuela. */
export function effectiveCommissionPct(seller, parent) {
  const own = Number(seller?.commission_pct) || 0;
  if (seller?.parent_partner_id && parent && parent.status === 'activo') return Number(parent.commission_pct) || own;
  return own;
}

/** Comisión de una venta, redondeada al peso. */
export function commissionAmount(saleAmount, pct) {
  const sale = Number(saleAmount) || 0;
  const p = Number(pct) || 0;
  if (sale <= 0 || p <= 0) return 0;
  return Math.round((sale * p) / 100);
}

/** Período contable `YYYY-MM` (UTC) de un pago. */
export function commissionPeriod(date = new Date()) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** ¿Puede el socio regalar otro perfil? Cuenta cupos usados vs. límite (límite vacío = sin tope). */
export function grantSeatsCheck(partner) {
  if (!partner || partner.status !== 'activo') return { ok: false, reason: 'inactivo', message: 'Este socio está inactivo y no puede regalar perfiles.' };
  const limit = partner.free_seats_limit;
  const used = Number(partner.free_seats_used) || 0;
  if (limit !== null && limit !== undefined && used >= limit) {
    return { ok: false, reason: 'sin_cupo', message: `Alcanzaste el límite de ${limit} perfiles gratis.` };
  }
  return { ok: true, remaining: limit === null || limit === undefined ? null : limit - used };
}

/** Fechas de un regalo: vence a los `freeDays` y se purga 90 días después. */
export function grantDates(freeDays, from = new Date()) {
  const start = new Date(from);
  const expires = new Date(start.getTime() + (Number(freeDays) || 90) * MS_DAY);
  const purge = new Date(expires.getTime() + GRANT_PURGE_DAYS * MS_DAY);
  return { granted_at: start.toISOString(), expires_at: expires.toISOString(), purge_after: purge.toISOString() };
}

/** Días que le quedan a un regalo (redondeo hacia arriba; ≤ 0 = ya venció). */
export function grantDaysLeft(expiresAt, now = new Date()) {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - new Date(now).getTime()) / MS_DAY);
}

/** ¿Toca avisar? Faltan GRANT_REMINDER_DAYS o menos y aún no vence. */
export function grantNeedsReminder(expiresAt, now = new Date()) {
  const left = grantDaysLeft(expiresAt, now);
  return left !== null && left > 0 && left <= GRANT_REMINDER_DAYS;
}

/** Estado de una invitación de socio, derivado (no se guarda `expirada` a mano al consultarla). */
export function partnerInvitationState(inv, now = Date.now()) {
  if (!inv) return 'inexistente';
  if (inv.status === 'aceptada') return 'usada';
  if (inv.status === 'revocada' || inv.status === 'expirada') return inv.status === 'revocada' ? 'revocada' : 'expirada';
  return new Date(inv.expires_at).getTime() <= now ? 'expirada' : 'usable';
}

/** Valida el alta/edición de un socio. Devuelve { ok, errors, clean }. */
export function validatePartnerInput(input, { partial = false } = {}) {
  const errors = [];
  const clean = {};
  if (!partial || input?.type !== undefined) {
    if (!PARTNER_TYPES.includes(input?.type)) errors.push('Elige si es escuela o asesor.');
    else clean.type = input.type;
  }
  if (!partial || input?.name !== undefined) {
    const name = String(input?.name || '').trim();
    if (name.length < 2) errors.push('Escribe el nombre del socio.');
    else if (name.length > 120) errors.push('El nombre es demasiado largo (máximo 120 caracteres).');
    else clean.name = name;
  }
  if (!partial || input?.commission_pct !== undefined) {
    const pct = Number(input?.commission_pct ?? 0);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) errors.push('La comisión debe estar entre 0 y 100.');
    else clean.commission_pct = pct;
  }
  if (!partial || input?.free_seats_limit !== undefined) {
    const raw = input?.free_seats_limit;
    if (raw === '' || raw === null || raw === undefined) clean.free_seats_limit = null;
    else {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0) errors.push('El cupo de perfiles gratis debe ser un entero positivo (o vacío para sin tope).');
      else clean.free_seats_limit = n;
    }
  }
  if (!partial || input?.free_days !== undefined) {
    const n = input?.free_days === '' || input?.free_days == null ? 90 : Number(input.free_days);
    if (!Number.isInteger(n) || n < 1 || n > 730) errors.push('Los días de regalo deben estar entre 1 y 730.');
    else clean.free_days = n;
  }
  if (input?.status !== undefined) {
    if (!['activo', 'inactivo'].includes(input.status)) errors.push('Estado inválido.');
    else clean.status = input.status;
  }
  if (input?.parent_partner_id !== undefined) clean.parent_partner_id = input.parent_partner_id || null;
  return { ok: errors.length === 0, errors, clean };
}
