// Skylog V2.0 — POST /api/suscripcion/wompi/webhook
// Wompi envía `transaction.updated` con un checksum SHA-256 (properties +
// timestamp + WOMPI_EVENTS_SECRET) — ver src/lib/wompi.js#verifyWebhookChecksum.
// Debe responder 200 rápido; Wompi reintenta 3 veces en 24h si no.
//
// Deliberadamente SIN portar de v1 (no existen todavía en V2, fuera de
// alcance de esta integración): atribución de comisión a socios
// (`attributeCommission`, no hay programa de socios en V2) y
// `billing_history` (no hay tabla de historial de facturación en V2).
import { createAdminClient } from '@/lib/supabaseServer';
import { verifyWebhookChecksum } from '@/lib/wompi';
import { activateSubscription } from '@/lib/v2/subscriptionActivation';

export async function GET() {
  return Response.json({ ok: true });
}

export async function POST(request) {
  try {
    const event = await request.json();

    console.log('[wompi-v2] webhook recibido:', JSON.stringify({
      event: event?.event,
      txId: event?.data?.transaction?.id,
      status: event?.data?.transaction?.status,
      reference: event?.data?.transaction?.reference,
    }));

    if (!verifyWebhookChecksum(event)) {
      console.error('[wompi-v2] webhook: checksum inválido');
      return Response.json({ error: 'Checksum inválido' }, { status: 401 });
    }

    if (event.event !== 'transaction.updated') {
      return Response.json({ received: true });
    }

    const tx = event.data.transaction;
    if (tx.status !== 'APPROVED') {
      // PENDING/DECLINED/VOIDED/ERROR — nada que activar. Si es un cobro del
      // cron de recurrencia, ese mismo cron ya registró el intento.
      return Response.json({ received: true });
    }

    const admin = createAdminClient();

    // Idempotencia — mismo tx.id no activa dos veces.
    const txId = tx.id;
    const { data: already } = await admin
      .from('wompi_processed_refs')
      .select('tx_id')
      .eq('tx_id', txId)
      .maybeSingle();
    if (already) {
      console.log(`[wompi-v2] webhook duplicado ignorado: tx=${txId}`);
      return Response.json({ received: true });
    }

    // reference = bitafly_v2_{plan}_{billing}_{organizationId}_{timestamp}
    // A diferencia de ePayco (v1), Wompi sí nos devuelve intacta la
    // referencia que enviamos — no hace falta cascada de resolución.
    const refParts = String(tx.reference || '').split('_');
    let plan = null, billing = null, organizationId = null;
    if (refParts[0] === 'bitafly' && refParts[1] === 'v2' && refParts.length >= 6) {
      plan = refParts[2];
      billing = refParts[3];
      organizationId = refParts[4];
    }

    if (!organizationId) {
      const { data: pending } = await admin
        .from('pending_subscriptions')
        .select('organization_id, plan, billing')
        .eq('reference', tx.reference)
        .maybeSingle();
      if (pending) {
        organizationId = pending.organization_id;
        plan = plan || pending.plan;
        billing = billing || pending.billing;
      }
    }

    if (!organizationId || !plan || !billing) {
      console.error('[wompi-v2] webhook: no se pudo identificar organización/plan. reference:', tx.reference);
      return Response.json({ received: true, warning: 'No se identificó organización/plan — revisa logs' });
    }

    await activateSubscription(admin, {
      organizationId,
      plan,
      billing,
      transactionId: tx.id,
      reference: tx.reference,
      wompiPaymentSourceId: tx.payment_source_id ? String(tx.payment_source_id) : null,
      amountInCents: tx.amount_in_cents,
    });

    // El error no se propaga (Wompi necesita un 200 rápido o reintenta), pero
    // sí se registra: si el marcador no entra, la guarda de idempotencia de
    // arriba —y la de /verify, que comparte este libro— deja de proteger esta
    // transacción, y eso no puede pasar en silencio.
    const { error: markError } = await admin.from('wompi_processed_refs').insert({ tx_id: txId });
    if (markError) {
      console.error('[wompi-v2] webhook: no se pudo marcar la tx como procesada:', txId, markError.message);
    }

    console.log(`[wompi-v2] ✓ Suscripción activada: org=${organizationId} plan=${plan} billing=${billing}`);
    return Response.json({ success: true });
  } catch (err) {
    console.error('[wompi-v2] webhook error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
