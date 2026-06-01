// POST /api/epayco/webhook
// ePayco llama a esta URL después de cada transacción (aprobada, rechazada, etc.)
// También se usa para notificaciones de suscripciones recurrentes.
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(request) {
  try {
    // ePayco envía application/x-www-form-urlencoded
    const body = await request.text();
    const params = Object.fromEntries(new URLSearchParams(body));

    // ── Verificación de firma ─────────────────────────────────────────────────
    // SHA256(P_CUST_ID_CLIENTE^P_KEY^x_ref_payco^x_transaction_id^x_amount^x_currency_code^x_transaction_state)
    const custId     = process.env.EPAYCO_P_CUST_ID;
    const privateKey = process.env.EPAYCO_PRIVATE_KEY;

    if (!custId || !privateKey) {
      console.error('EPAYCO_P_CUST_ID o EPAYCO_PRIVATE_KEY no configurados');
      return NextResponse.json({ error: 'Webhook no configurado' }, { status: 500 });
    }

    const sigRaw = [
      custId,
      privateKey,
      params.x_ref_payco,
      params.x_transaction_id,
      params.x_amount,
      params.x_currency_code,
      params.x_transaction_state,
    ].join('^');

    const expectedSig = crypto.createHash('sha256').update(sigRaw).digest('hex');
    const receivedSig = (params.x_signature || '').toLowerCase();

    if (expectedSig !== receivedSig) {
      console.warn('ePayco webhook: firma inválida');
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
    }

    // ── Solo procesar transacciones aprobadas ─────────────────────────────────
    if (params.x_transaction_state !== 'Aceptada') {
      console.log(`ePayco webhook: estado=${params.x_transaction_state} — ignorado`);
      return NextResponse.json({ received: true });
    }

    // ── Extraer datos de la transacción ───────────────────────────────────────
    const planKey  = params.x_extra1; // escuadrilla | flota
    const billing  = params.x_extra2; // monthly | annual
    const userId   = params.x_extra3;

    if (!planKey || !userId) {
      console.error('ePayco webhook: faltan extra1/extra3', params);
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // ── Calcular fecha de expiración ──────────────────────────────────────────
    const now = new Date();
    const expiresAt = new Date(now);
    if (billing === 'annual') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // ── Actualizar Supabase con Service Role (bypasa RLS) ────────────────────
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_plan:       planKey,
        epayco_subscription_id:  params.x_subscription_id || null,
        epayco_ref:              params.x_ref_payco,
        subscription_expires_at: expiresAt.toISOString(),
        updated_at:              now.toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;

    console.log(`Suscripción activada: user=${userId} plan=${planKey} billing=${billing} expires=${expiresAt.toISOString()}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('ePayco webhook error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
