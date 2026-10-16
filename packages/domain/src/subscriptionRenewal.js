// subscriptionRenewal — reglas puras del cobro con Wompi: formato de referencias, política de reintentos del cobro
// recurrente, monto esperado y fecha desde la que se extiende el plan. Servidor (webhook, verify, cron) y pruebas usan
// estas mismas funciones (auditoría 2026-10-16, hallazgo C2).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Política del cobro recurrente: 3 intentos por ciclo, separados al menos 3 días; nunca se empieza a cobrar un ciclo vencido hace más de 15 días. */
export const RENEWAL_POLICY = { maxAttempts: 3, minDaysBetween: 3, giveUpAfterDays: 15 };

const DAY_MS = 86400000;
const dayStart = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const asDate = (v) => (v instanceof Date ? v : new Date(String(v).length === 10 ? `${v}T00:00:00Z` : v));

/** Ciclo de una suscripción = su fecha de vencimiento en formato AAAAMMDD. */
export function renewalCycleKey(expiresAt) {
  return String(expiresAt).slice(0, 10).replaceAll('-', '');
}

/** Referencia del cobro del primer pago (Widget). */
export function buildCheckoutReference({ plan, billing, organizationId, timestamp = Date.now() }) {
  return `bitafly_v2_${plan}_${billing}_${organizationId}_${timestamp}`;
}

/** Referencia de un intento de renovación: fija por ciclo e intento, así dos ejecuciones simultáneas chocan en vez de cobrar dos veces. */
export function buildRenewalReference({ plan, billing, organizationId, expiresAt, attempt }) {
  return `bitafly_v2_renew_${plan}_${billing}_${organizationId}_${renewalCycleKey(expiresAt)}_a${attempt}`;
}

/** ¿Esta referencia es un intento de renovación del ciclo indicado de esa organización? */
export function isRenewalOfCycle(reference, { organizationId, expiresAt }) {
  const p = String(reference || '').split('_');
  return p[0] === 'bitafly' && p[1] === 'v2' && p[2] === 'renew' && p[5] === organizationId && p[6] === renewalCycleKey(expiresAt) && /^a\d+$/.test(p[7] || '');
}

/**
 * Lee una referencia de BitaFly V2. Primer pago: bitafly_v2_{plan}_{billing}_{org}_{ts}.
 * Renovación: bitafly_v2_renew_{plan}_{billing}_{org}_{ciclo}_a{n}. Devuelve null si no es nuestra o está mal formada.
 */
export function parseWompiReference(reference) {
  const p = String(reference || '').split('_');
  if (p[0] !== 'bitafly' || p[1] !== 'v2') return null;
  const renewal = p[2] === 'renew';
  const [plan, billing, organizationId] = renewal ? [p[3], p[4], p[5]] : [p[2], p[3], p[4]];
  if (!plan || !billing || !UUID_RE.test(organizationId || '')) return null;
  return { kind: renewal ? 'renewal' : 'checkout', plan, billing, organizationId };
}

/** ¿El monto cobrado es exactamente el precio del plan y ciclo? (los precios no tienen descuentos). */
export function isExpectedAmount({ plan, billing, amountInCents, pricing }) {
  const cfg = pricing?.[plan]?.[billing];
  if (!cfg || amountInCents == null) return false;
  return Number(amountInCents) === Math.round(cfg.amount * 100);
}

/**
 * Fecha desde la que se suma el período pagado: el vencimiento actual si todavía no ha llegado (quien paga antes no
 * pierde días), o hoy si ya venció. Devuelve AAAA-MM-DD.
 */
export function renewalBaseDate(currentExpiresAt, today = new Date()) {
  const todayIso = new Date(dayStart(today)).toISOString().slice(0, 10);
  if (!currentExpiresAt) return todayIso;
  const current = String(currentExpiresAt).slice(0, 10);
  return current > todayIso ? current : todayIso;
}

/** Suma un mes o un año a una fecha AAAA-MM-DD (fin de mes se ajusta como lo hace JavaScript). */
export function addBillingPeriod(baseIso, billing) {
  const d = new Date(`${baseIso}T00:00:00Z`);
  if (billing === 'annual') d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Decide si hoy se intenta cobrar la renovación de un ciclo.
 * @param {{expiresAt: string, today?: Date, attempts?: {createdAt: string}[], policy?: object}} input
 * @returns {{ attempt: number } | { skip: 'not_due' | 'expired_too_long' | 'max_attempts' | 'too_soon' }}
 */
export function nextRenewalAttempt({ expiresAt, today = new Date(), attempts = [], policy = RENEWAL_POLICY }) {
  const expiry = dayStart(asDate(expiresAt));
  const now = dayStart(today);
  if (expiry > now) return { skip: 'not_due' };
  if (attempts.length >= policy.maxAttempts) return { skip: 'max_attempts' };
  if (!attempts.length && now - expiry > policy.giveUpAfterDays * DAY_MS) return { skip: 'expired_too_long' };
  const last = Math.max(...attempts.map((a) => dayStart(asDate(a.createdAt))));
  if (attempts.length && now - last < policy.minDaysBetween * DAY_MS) return { skip: 'too_soon' };
  return { attempt: attempts.length + 1 };
}
