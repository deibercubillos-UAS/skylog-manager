// POST /api/epayco/verify  { ref_payco }
// Verifica un pago contra el endpoint público de validación de ePayco y activa
// el plan del usuario autenticado, SIN depender del webhook server-to-server.
// Es la red de seguridad: cuando el usuario regresa del pago, confirmamos la
// transacción y activamos de inmediato. Idempotente con el webhook.
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { activatePlanForUser, resolvePendingForUser } from '@/lib/epaycoActivation';
import { PLAN_CONFIG } from '@/lib/planLimits';

const VALIDATION_URL = (ref) => `https://secure.epayco.co/validation/v1/reference/${ref}`;

export async function POST(request) {
  try {
    const ssr = await createClientSSR();
    const { user } = await getOrgContext(ssr);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { ref_payco } = await request.json().catch(() => ({}));

    // Sin ref_payco no podemos verificar el pago → dejamos que el webhook actúe.
    if (!ref_payco) {
      return NextResponse.json({ activated: false, reason: 'sin_referencia' });
    }

    // ── Consultar estado real de la transacción en ePayco ─────────────────────
    const res  = await fetch(VALIDATION_URL(ref_payco), { cache: 'no-store' });
    const json = await res.json().catch(() => null);
    const tx   = json?.data;

    if (!json?.success || !tx) {
      return NextResponse.json({ activated: false, reason: 'no_encontrada' });
    }

    // x_cod_response: 1 = aceptada. También aceptamos x_transaction_state textual.
    const approved =
      String(tx.x_cod_response) === '1' ||
      tx.x_transaction_state === 'Aceptada' ||
      tx.x_response === 'Aceptada';

    if (!approved) {
      return NextResponse.json({
        activated: false,
        reason:    'no_aprobada',
        state:     tx.x_transaction_state || tx.x_response || null,
      });
    }

    // ── Anti-fraude: el pago debe pertenecer al usuario autenticado ───────────
    // El enlace es el email (subscription-landing no transporta nuestra ref).
    const txEmail = (tx.x_customer_email || tx.x_email || '').trim().toLowerCase();
    const myEmail = (user.email || '').trim().toLowerCase();
    const extraUserId = tx.x_extra3 || null;

    const belongsToUser =
      (txEmail && myEmail && txEmail === myEmail) ||
      (extraUserId && extraUserId === user.id);

    if (!belongsToUser) {
      console.warn(`verify: pago ${ref_payco} no coincide con usuario ${user.id} (txEmail=${txEmail})`);
      return NextResponse.json({ activated: false, reason: 'no_coincide_usuario' });
    }

    // ── Resolver qué plan compró (intent más reciente del usuario) ────────────
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let planKey = tx.x_extra1 || null;
    let billing = tx.x_extra2 || null;

    if (!planKey) {
      const pending = await resolvePendingForUser(admin, user.id);
      if (pending) { planKey = pending.planKey; billing = pending.billing; }
    }

    if (!planKey) {
      return NextResponse.json({ activated: false, reason: 'plan_no_resuelto' });
    }

    const result = await activatePlanForUser(admin, {
      userId:         user.id,
      planKey,
      billing:        billing || 'monthly',
      subscriptionId: tx.x_subscription_id || null,
      ref:            tx.x_ref_payco || ref_payco,
    });

    console.log(`✓ Suscripción activada vía verify: user=${user.id} plan=${planKey}`);
    return NextResponse.json({
      activated: true,
      planSlug:  planKey,
      planName:  PLAN_CONFIG[planKey]?.name || planKey,
      expiresAt: result.expiresAt,
    });

  } catch (err) {
    console.error('verify error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
