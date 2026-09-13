// POST /api/wompi/webhook — reemplaza /api/epayco/webhook.
// Wompi envía `transaction.updated` con un checksum SHA-256 (properties +
// timestamp + WOMPI_EVENTS_SECRET) — ver src/lib/wompi.js#verifyWebhookChecksum.
// Debe responder 200 rápido; Wompi reintenta 3 veces en 24h si no.
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWebhookChecksum } from '@/lib/wompi';
import { activatePlanForUser, createAccountFromPendingRegistration } from '@/lib/epaycoActivation';
import { attributeCommission } from '@/lib/partnerReferral';

function makeSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request) {
  try {
    const event = await request.json();

    console.log('[wompi] webhook recibido:', JSON.stringify({
      event: event?.event,
      txId: event?.data?.transaction?.id,
      status: event?.data?.transaction?.status,
      reference: event?.data?.transaction?.reference,
    }));

    if (!verifyWebhookChecksum(event)) {
      console.error('[wompi] webhook: checksum inválido');
      return NextResponse.json({ error: 'Checksum inválido' }, { status: 401 });
    }

    if (event.event !== 'transaction.updated') {
      return NextResponse.json({ received: true });
    }

    const tx = event.data.transaction;
    if (tx.status !== 'APPROVED') {
      // PENDING/DECLINED/VOIDED/ERROR — nada que activar. El cliente puede
      // reintentar desde /dashboard/subscription; si es un cobro del cron de
      // recurrencia, ese mismo cron ya marcó el intento como "declinado".
      return NextResponse.json({ received: true });
    }

    const supabase = makeSupabase();

    // ── Idempotencia — mismo patrón que ePayco, reutilizando processed_webhook_refs ──
    const txId = tx.id;
    const { data: already } = await supabase
      .from('processed_webhook_refs')
      .select('ref_payco')
      .eq('ref_payco', txId)
      .maybeSingle();
    if (already) {
      console.log(`[wompi] webhook duplicado ignorado: tx=${txId}`);
      return NextResponse.json({ received: true });
    }

    // ── Resolver usuario/plan por la referencia que nosotros generamos ────────
    // reference = `bitafly_{planKey}_{billing}_{userId}_{timestamp}` (ver
    // /api/wompi/checkout) — a diferencia de ePayco, Wompi SÍ nos devuelve
    // intacta la referencia que enviamos, así que no hace falta la cascada de
    // 5 pasos que tenía el webhook de ePayco.
    const refParts = String(tx.reference || '').split('_');
    let userId = null, planKey = null, billing = null;
    if (refParts[0] === 'bitafly' && refParts.length >= 5) {
      planKey = refParts[1];
      billing = refParts[2];
      userId  = refParts[3];
    }

    let partnerCode = null;
    if (userId) {
      const { data: pending } = await supabase
        .from('pending_subscriptions')
        .select('partner_code, plan_key, billing')
        .eq('reference', tx.reference)
        .maybeSingle();
      if (pending) {
        partnerCode = pending.partner_code || null;
        planKey = planKey || pending.plan_key;
        billing = billing || pending.billing;
      }
    }

    // ── Nuevo usuario (pago-antes-de-registro) ────────────────────────────────
    if (!userId && tx.customer_email) {
      const newUserId = await createAccountFromPendingRegistration(supabase, tx.customer_email, {
        planKey, billing: billing || 'monthly', subscriptionId: null, ref: txId,
      });
      if (newUserId) {
        console.log(`[wompi] ✓ Cuenta nueva creada desde pending_registration: user=${newUserId}`);
        return NextResponse.json({ success: true });
      }
    }

    if (!userId || !planKey) {
      console.error('[wompi] webhook: no se pudo identificar usuario/plan. reference:', tx.reference);
      return NextResponse.json({ received: true, warning: 'No se identificó usuario/plan — revisa logs' });
    }

    // ── Guardar la fuente de pago tokenizada para el cron de recurrencia ──────
    const wompiPaymentSourceId = tx.payment_source_id ? String(tx.payment_source_id) : null;

    await activatePlanForUser(supabase, {
      userId,
      planKey,
      billing: billing || 'monthly',
      subscriptionId: tx.id,
      ref: tx.reference,
      provider: 'wompi',
      wompiPaymentSourceId,
    });

    await supabase.from('processed_webhook_refs')
      .insert({ ref_payco: txId })
      .then(() => {}, () => {});

    // ── Atribución de comisión a socio (no crítico) ───────────────────────────
    try {
      if (partnerCode) {
        const { data: prof } = await supabase
          .from('profiles').select('active_organization_id').eq('id', userId).single();
        if (prof?.active_organization_id) {
          await attributeCommission(supabase, {
            code: partnerCode,
            orgId: prof.active_organization_id,
            planKey,
            billing: billing || 'monthly',
            amount: tx.amount_in_cents ? tx.amount_in_cents / 100 : null,
            refPayco: txId,
          });
        }
      }
    } catch (attrErr) {
      console.error('[wompi] atribución socio falló (no crítico):', attrErr.message);
    }

    // ── Historial de facturación (no crítico) ─────────────────────────────────
    try {
      const { data: prof } = await supabase
        .from('profiles').select('active_organization_id').eq('id', userId).maybeSingle();
      await supabase.from('billing_history').insert({
        organization_id: prof?.active_organization_id || null,
        user_id: userId,
        ref_payco: txId,
        plan_key: planKey,
        billing: billing || 'monthly',
        amount: tx.amount_in_cents ? tx.amount_in_cents / 100 : null,
        currency: tx.currency || 'COP',
        status: 'pagada',
      }).then(() => {}, () => {});
    } catch (billErr) {
      console.error('[wompi] billing_history falló (no crítico):', billErr.message);
    }

    console.log(`[wompi] ✓ Suscripción activada: user=${userId} plan=${planKey} billing=${billing}`);
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('[wompi] webhook error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
