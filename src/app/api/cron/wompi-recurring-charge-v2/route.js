// GET /api/cron/wompi-recurring-charge-v2 — Vercel Cron (diario).
// Equivalente V2 de v1 `/api/cron/wompi-recurring-charge`, adaptado a la
// entidad `subscriptions` (por organización) en vez de `profiles` (por
// usuario). Wompi no tiene un motor de "plan hospedado" que cobre solo —
// esta app dispara cada cobro server-to-server con la tarjeta ya tokenizada
// (`wompi_payment_source_id`, guardado en el primer pago vía el Widget).
//
// Nombrado "-v2" (ruta separada de la de v1) a propósito: ambas apps
// comparten el mismo proyecto de Supabase durante la transición, y cada cron
// solo debe tocar su propia entidad (v1 → profiles, V2 → subscriptions) —
// nunca fusionarlos en un único cron mientras convivan los dos modelos.
//
// - Aprobado  → activateSubscription() renueva el ciclo (misma función que
//   usa el webhook y /verify de V2).
// - Declinado → no se reintenta agresivamente aquí (el emisor puede exigir
//   reautenticación fuera de Mastercard/3RI) — se deja que el aviso de
//   vencimiento ya existente en /suscripcion invite al pago manual, mismo
//   patrón "tarjeta declinada → dunning" de cualquier sistema de suscripciones.
//
// Secured con Authorization: Bearer CRON_SECRET (mismo patrón que el resto
// de crons del proyecto).
import { createAdminClient } from '@/lib/supabaseServer';
import { createRecurringTransaction } from '@/lib/wompi';
import { activateSubscription } from '@/lib/v2/subscriptionActivation';
import { PLAN_PRICING } from '@/lib/v2/planLimits';

export const dynamic = 'force-dynamic';

function verifyAuth(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (request.headers.get('authorization') || '') === `Bearer ${secret}`;
}

export async function GET(request) {
  if (!verifyAuth(request)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: dueSubs, error } = await admin
    .from('subscriptions')
    .select('organization_id, plan, billing, expires_at, wompi_payment_source_id')
    .eq('payment_provider', 'wompi')
    .not('wompi_payment_source_id', 'is', null)
    .lte('expires_at', nowIso.slice(0, 10));

  if (error) {
    console.error('[wompi-cron-v2] error consultando subscriptions:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  const results = { attempted: 0, renewed: 0, declined: 0, errors: [] };

  for (const sub of dueSubs || []) {
    const cfg = PLAN_PRICING[sub.plan]?.[sub.billing];
    if (!cfg) continue; // Enterprise u otro plan sin precio fijo — se gestiona a mano

    // Correo del contacto de facturación: resuelto vía la membresía admin de
    // la organización (accounts.email), no se guarda un email propio en
    // `subscriptions` para no duplicar la fuente de verdad de identidad.
    const { data: adminMember } = await admin
      .from('memberships')
      .select('person_id')
      .eq('organization_id', sub.organization_id)
      .eq('role', 'admin')
      .eq('status', 'activa')
      .limit(1)
      .maybeSingle();
    const { data: account } = adminMember
      ? await admin.from('accounts').select('email').eq('person_id', adminMember.person_id).maybeSingle()
      : { data: null };
    if (!account?.email) continue; // sin admin real a quien cobrar/notificar

    results.attempted++;
    const reference = `bitafly_v2_renew_${sub.plan}_${sub.billing}_${sub.organization_id}_${Date.now()}`;

    try {
      const { data: tx } = await createRecurringTransaction({
        paymentSourceId: sub.wompi_payment_source_id,
        amountInCents: cfg.amount * 100,
        currency: 'COP',
        customerEmail: account.email,
        reference,
      });

      if (tx.status === 'APPROVED') {
        await activateSubscription(admin, {
          organizationId: sub.organization_id,
          plan: sub.plan,
          billing: sub.billing,
          transactionId: tx.id,
          reference,
          wompiPaymentSourceId: sub.wompi_payment_source_id,
        });
        results.renewed++;
      } else {
        results.declined++;
        console.log(`[wompi-cron-v2] cobro declinado: org=${sub.organization_id} status=${tx.status}`);
      }
    } catch (chargeErr) {
      results.declined++;
      results.errors.push({ organizationId: sub.organization_id, message: chargeErr.message });
      console.error(`[wompi-cron-v2] error cobrando org=${sub.organization_id}:`, chargeErr.message);
    }
  }

  console.log('[wompi-cron-v2] resultado:', JSON.stringify(results));
  return Response.json(results);
}
