// Skylog V2.0 — activa/renueva una suscripción tras un pago real de Wompi.
// Equivalente V2 de `activatePlanForUser()` (v1, `lib/epaycoActivation.js`),
// pero sobre la entidad `subscriptions` (por organización) en vez de
// `profiles` (por usuario) — coherente con el modelo people/accounts/
// memberships/organizations de V2. Usado por checkout/verify/webhook/cron.
import { PLANS, PLAN_PRICING } from './planLimits';
import { attributeCommission } from './referrals';
import { parseWompiReference, isExpectedAmount, renewalBaseDate, addBillingPeriod } from '@skylog/domain';

export async function activateSubscription(admin, {
  organizationId, plan, billing, transactionId = null, reference = null,
  wompiPaymentSourceId = null, amountInCents = null,
}) {
  if (!organizationId) throw new Error('organizationId es requerido');
  if (!PLANS.includes(plan) || plan === 'enterprise') {
    throw new Error(`plan inválido para activación por pago: "${plan}"`);
  }
  if (!['monthly', 'annual'].includes(billing)) {
    throw new Error(`billing inválido: "${billing}"`);
  }

  const now = new Date();
  // Se extiende desde el vencimiento vigente si aún no llega (quien paga antes no pierde días); si ya venció, desde hoy.
  const { data: current } = await admin.from('subscriptions').select('expires_at').eq('organization_id', organizationId).maybeSingle();
  const expiresAt = addBillingPeriod(renewalBaseDate(current?.expires_at, now), billing);

  const patch = {
    organization_id: organizationId,
    plan,
    billing,
    payment_provider: 'wompi',
    expires_at: expiresAt,
    updated_at: now.toISOString(),
  };
  // `notes` solo se toca si hay algo real que registrar — un upsert que
  // incluyera `notes: null` sobrescribiría en silencio cualquier nota manual
  // que un admin ya hubiera dejado (ver /suscripcion, campo "Notas internas").
  if (reference) patch.notes = `Wompi tx=${transactionId || 's/d'} ref=${reference}`;
  if (wompiPaymentSourceId) {
    patch.wompi_payment_source_id = wompiPaymentSourceId;
    patch.canceled_at = null; // pagó de nuevo con tarjeta: la renovación automática vuelve a estar activa
  }

  const { data, error } = await admin
    .from('subscriptions')
    .upsert(patch, { onConflict: 'organization_id' })
    .select()
    .single();
  if (error) throw error;

  // Historial de pagos (informativo). Nunca rompe la activación; idempotente por transacción.
  try {
    if (transactionId) {
      const amount = amountInCents != null ? Number(amountInCents) / 100 : PLAN_PRICING[plan]?.[billing]?.amount;
      if (amount != null) {
        const { error: historyError } = await admin
          .from('billing_history')
          .upsert({ organization_id: organizationId, provider: 'wompi', transaction_id: String(transactionId), reference: reference || null, plan, billing, amount_cop: amount, paid_at: now.toISOString() }, { onConflict: 'provider,transaction_id', ignoreDuplicates: true });
        if (historyError) console.error('[billing_history] no se pudo registrar el pago:', historyError.message);
      }
    }
  } catch (e) {
    console.error('[billing_history] error registrando el pago:', e.message);
  }

  // Comisión del socio por ESTE pago (Etapa E3). Nunca rompe la activación: se atrapa y se registra.
  try {
    const paymentReference = transactionId || reference;
    if (paymentReference) {
      const amount = amountInCents != null ? Number(amountInCents) / 100 : PLAN_PRICING[plan]?.[billing]?.amount;
      const { data: pending } = reference ? await admin.from('pending_subscriptions').select('partner_code').eq('reference', reference).maybeSingle() : { data: null };
      const r = await attributeCommission(admin, { organizationId, explicitCode: pending?.partner_code, plan, billing, amount, paymentReference });
      if (r.error) console.error('[referrals] no se pudo atribuir la comisión:', r.error);
    }
  } catch (e) {
    console.error('[referrals] error atribuyendo la comisión:', e.message);
  }
  return data;
}

/** Plan, ciclo y organización de una referencia de Wompi: primero el registro que guardó el servidor, si no, la propia referencia. */
export async function resolveWompiReference(admin, reference) {
  if (!reference) return null;
  const { data: pending } = await admin.from('pending_subscriptions').select('organization_id, plan, billing').eq('reference', reference).maybeSingle();
  if (pending) return { organizationId: pending.organization_id, plan: pending.plan, billing: pending.billing };
  const parsed = parseWompiReference(reference);
  return parsed ? { organizationId: parsed.organizationId, plan: parsed.plan, billing: parsed.billing } : null;
}

/**
 * Activa una transacción APROBADA de Wompi una sola vez. Comparten esta función el webhook, /verify y el cron: la
 * transacción se reclama en `wompi_processed_refs` ANTES de activar (así dos de ellos no activan el mismo pago dos
 * veces) y se libera si la activación falla (así un reintento legítimo sigue siendo posible).
 * @returns {Promise<{status: 'activated'|'already_processed'|'unknown_reference'|'forbidden'|'amount_mismatch', resolved?: object, subscription?: object}>}
 */
export async function activateFromWompiTransaction(admin, tx, { allowedOrganizationIds = null } = {}) {
  const resolved = await resolveWompiReference(admin, tx?.reference);
  if (!resolved) return { status: 'unknown_reference' };
  if (allowedOrganizationIds && !allowedOrganizationIds.includes(resolved.organizationId)) return { status: 'forbidden', resolved };
  if (!isExpectedAmount({ plan: resolved.plan, billing: resolved.billing, amountInCents: tx.amount_in_cents, pricing: PLAN_PRICING })) {
    return { status: 'amount_mismatch', resolved };
  }

  const txId = String(tx.id);
  const { error: claimError } = await admin.from('wompi_processed_refs').insert({ tx_id: txId });
  if (claimError) {
    if (claimError.code === '23505') return { status: 'already_processed', resolved };
    throw claimError;
  }

  try {
    const subscription = await activateSubscription(admin, {
      organizationId: resolved.organizationId,
      plan: resolved.plan,
      billing: resolved.billing,
      transactionId: txId,
      reference: tx.reference,
      wompiPaymentSourceId: tx.payment_source_id ? String(tx.payment_source_id) : null,
      amountInCents: tx.amount_in_cents,
    });
    return { status: 'activated', resolved, subscription };
  } catch (err) {
    const { error: releaseError } = await admin.from('wompi_processed_refs').delete().eq('tx_id', txId);
    if (releaseError) console.error('[wompi] no se pudo liberar la tx tras un fallo; requiere revisión manual:', txId, releaseError.message);
    throw err;
  }
}
