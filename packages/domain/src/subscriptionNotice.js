// subscriptionNotice — aviso de suscripción para el Gerente General (docs/skylog-v2/32-migracion.md decisiones B y C).
// Lógica pura: dado el estado de la suscripción, qué se le muestra. Un cliente que viene de ePayco conserva su acceso
// hasta el vencimiento ya pagado y se le pide activar el cobro con Wompi ANTES de esa fecha (sin cobrarle dos veces:
// la recurrencia de ePayco se cancela el día del corte).

export const NOTICE_UPCOMING_DAYS = 7;
const MS_DAY = 86_400_000;

const todayKey = (now) => new Date(new Date(now).getTime() - 5 * 3_600_000).toISOString().slice(0, 10); // fecha de Colombia

/** Días hasta el vencimiento (negativo = ya venció). null sin vencimiento. */
export function daysUntil(expiresAt, now = new Date()) {
  if (!expiresAt) return null;
  const a = Date.parse(`${String(expiresAt).slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${todayKey(now)}T00:00:00Z`);
  return Math.round((a - b) / MS_DAY);
}

/**
 * @param {{plan?: string, expires_at?: string|null, payment_provider?: string|null, wompi_payment_source_id?: string|null, migrated_from_v1?: boolean}} sub
 * @returns {{ level: 'none'|'migration'|'upcoming'|'expired', daysLeft: number|null, title?: string, message?: string, cta?: string }}
 */
export function subscriptionNotice(sub, now = new Date()) {
  if (!sub) return { level: 'none', daysLeft: null };
  const daysLeft = daysUntil(sub.expires_at, now);
  const hasCard = sub.payment_provider === 'wompi' && !!sub.wompi_payment_source_id;
  const free = sub.plan === 'enterprise' || !sub.expires_at; // Enterprise y cuentas sin vencimiento no cobran

  if (free) return { level: 'none', daysLeft };

  if (daysLeft !== null && daysLeft < 0) {
    return {
      level: 'expired',
      daysLeft,
      title: 'Tu suscripción venció',
      message: hasCard ? 'No se pudo renovar el cobro de tu tarjeta. Revisa el medio de pago para recuperar el acceso completo.' : 'Para seguir usando todas las funciones, elige un plan y paga con tarjeta.',
      cta: hasCard ? 'Revisar el pago' : 'Pagar ahora',
    };
  }
  // Viene de la versión anterior y todavía no activó su cobro nuevo.
  if (sub.migrated_from_v1 && !hasCard) {
    return {
      level: 'migration',
      daysLeft,
      title: 'Activa tu pago en la nueva versión de BitaFly',
      message: `Conservas tu plan hasta el ${String(sub.expires_at).slice(0, 10)}${daysLeft !== null ? ` (${daysLeft} día${daysLeft === 1 ? '' : 's'})` : ''}. Para que no se interrumpa, registra tu tarjeta con Wompi antes de esa fecha: el cobro con ePayco se cancela y no se te cobra dos veces.`,
      cta: 'Activar pago con Wompi',
    };
  }
  if (!hasCard && daysLeft !== null && daysLeft <= NOTICE_UPCOMING_DAYS) {
    return { level: 'upcoming', daysLeft, title: `Tu suscripción vence ${daysLeft === 0 ? 'hoy' : `en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`}`, message: 'Renuévala para no perder el acceso.', cta: 'Pagar ahora' };
  }
  return { level: 'none', daysLeft };
}
