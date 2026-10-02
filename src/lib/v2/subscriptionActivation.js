// Skylog V2.0 — activa/renueva una suscripción tras un pago real de Wompi.
// Equivalente V2 de `activatePlanForUser()` (v1, `lib/epaycoActivation.js`),
// pero sobre la entidad `subscriptions` (por organización) en vez de
// `profiles` (por usuario) — coherente con el modelo people/accounts/
// memberships/organizations de V2. Usado por checkout/verify/webhook/cron.
import { PLANS } from './planLimits';

export async function activateSubscription(admin, {
  organizationId, plan, billing, transactionId = null, reference = null,
  wompiPaymentSourceId = null,
}) {
  if (!organizationId) throw new Error('organizationId es requerido');
  if (!PLANS.includes(plan) || plan === 'enterprise') {
    throw new Error(`plan inválido para activación por pago: "${plan}"`);
  }
  if (!['monthly', 'annual'].includes(billing)) {
    throw new Error(`billing inválido: "${billing}"`);
  }

  const now = new Date();
  const expiresAt = new Date(now);
  if (billing === 'annual') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  else expiresAt.setMonth(expiresAt.getMonth() + 1);

  const patch = {
    organization_id: organizationId,
    plan,
    billing,
    payment_provider: 'wompi',
    expires_at: expiresAt.toISOString().slice(0, 10),
    updated_at: now.toISOString(),
  };
  // `notes` solo se toca si hay algo real que registrar — un upsert que
  // incluyera `notes: null` sobrescribiría en silencio cualquier nota manual
  // que un admin ya hubiera dejado (ver /suscripcion, campo "Notas internas").
  if (reference) patch.notes = `Wompi tx=${transactionId || 's/d'} ref=${reference}`;
  if (wompiPaymentSourceId) patch.wompi_payment_source_id = wompiPaymentSourceId;

  const { data, error } = await admin
    .from('subscriptions')
    .upsert(patch, { onConflict: 'organization_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
