// POST /api/epayco/webhook
// ePayco llama aquí después de cada transacción aprobada o rechazada.
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const body   = await request.text();
    const params = Object.fromEntries(new URLSearchParams(body));

    // ── Verificación de firma ─────────────────────────────────────────────────
    const custId     = process.env.EPAYCO_P_CUST_ID;
    const privateKey = process.env.EPAYCO_PRIVATE_KEY;

    if (!custId || !privateKey) {
      console.error('EPAYCO_P_CUST_ID o EPAYCO_PRIVATE_KEY no configurados');
      return NextResponse.json({ error: 'Webhook no configurado' }, { status: 500 });
    }

    const sigRaw = [custId, privateKey,
      params.x_ref_payco, params.x_transaction_id,
      params.x_amount, params.x_currency_code, params.x_transaction_state,
    ].join('^');

    const expectedSig = crypto.createHash('sha256').update(sigRaw).digest('hex');
    const receivedSig = (params.x_signature || '').toLowerCase();

    if (expectedSig !== receivedSig) {
      console.warn('ePayco webhook: firma inválida', { expected: expectedSig, received: receivedSig });
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
    }

    // ── Solo procesar transacciones aprobadas ─────────────────────────────────
    if (params.x_transaction_state !== 'Aceptada') {
      console.log(`ePayco webhook ignorado: estado=${params.x_transaction_state}`);
      return NextResponse.json({ received: true });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ── Identificar usuario: primero por extras, luego por referencia ─────────
    let planKey = params.x_extra1;
    let billing = params.x_extra2;
    let userId  = params.x_extra3;

    // Si no vienen extras (flujo redirect), buscar en pending_subscriptions
    if (!userId && params.x_id_invoice) {
      const { data: pending } = await supabase
        .from('pending_subscriptions')
        .select('*')
        .eq('reference', params.x_id_invoice)
        .single();

      if (pending) {
        planKey = pending.plan_key;
        billing = pending.billing;
        userId  = pending.user_id;
      }
    }

    // También intentar por email si aún no encontramos el usuario
    if (!userId && params.x_customer_email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', params.x_customer_email)
        .single();
      if (profile) userId = profile.id;
    }

    if (!planKey || !userId) {
      console.error('ePayco webhook: no se pudo identificar usuario/plan', params);
      return NextResponse.json({ error: 'No se pudo identificar usuario' }, { status: 400 });
    }

    // ── Calcular fecha de expiración ──────────────────────────────────────────
    const now       = new Date();
    const expiresAt = new Date(now);
    if (billing === 'annual') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // ── Activar plan en Supabase ──────────────────────────────────────────────
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_plan:       planKey,
        epayco_subscription_id:  params.x_subscription_id || null,
        epayco_ref:              params.x_ref_payco,
        subscription_expires_at: expiresAt.toISOString(),
        updated_at:              now.toISOString(),
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Limpiar el intent pendiente
    if (params.x_id_invoice) {
      await supabase.from('pending_subscriptions').delete().eq('reference', params.x_id_invoice);
    }

    console.log(`Suscripción activada: user=${userId} plan=${planKey} billing=${billing}`);
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('ePayco webhook error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
