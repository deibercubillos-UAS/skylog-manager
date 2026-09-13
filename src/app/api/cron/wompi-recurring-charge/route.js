// GET /api/cron/wompi-recurring-charge — Vercel Cron (diario)
// Reemplaza el auto-cobro que ePayco hacía internamente en sus "planes
// hospedados". Wompi no tiene ese motor — esta app dispara cada cobro.
//
// Para cada perfil con `wompi_payment_source_id` guardado y
// `subscription_expires_at` venciendo hoy (o ya vencido, hasta 3 días de
// gracia): intenta un cobro server-to-server con la tarjeta tokenizada.
// - Aprobado  → activatePlanForUser() renueva el ciclo (misma función que
//   usa el webhook y /verify).
// - Declinado → NO se reintenta agresivamente aquí (el emisor puede exigir
//   reautenticación — ver docs/wompi-migration.md, limitación 3RI/Mastercard).
//   Se deja que SubscriptionExpiryBanner.js (ya existente) avise al cliente
//   para que pague manualmente desde /dashboard/subscription — mismo patrón
//   de "tarjeta declinada → aviso" que cualquier sistema de suscripciones.
//
// Secured con Authorization: Bearer CRON_SECRET (mismo patrón que
// cron/free-grants).
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRecurringTransaction } from '@/lib/wompi';
import { activatePlanForUser } from '@/lib/epaycoActivation';
import { WOMPI_PLANS } from '@/lib/planLimits';

export const dynamic = 'force-dynamic';

function verifyAuth(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (request.headers.get('authorization') || '') === `Bearer ${secret}`;
}

function makeAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET(request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const admin = makeAdmin();
  const now = new Date();
  const windowEnd = now.toISOString();

  const { data: dueProfiles, error } = await admin
    .from('profiles')
    .select('id, email, subscription_plan, subscription_expires_at, wompi_payment_source_id, active_organization_id')
    .not('wompi_payment_source_id', 'is', null)
    .eq('payment_provider', 'wompi')
    .lte('subscription_expires_at', windowEnd);

  if (error) {
    console.error('[wompi-cron] error consultando perfiles:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = { attempted: 0, renewed: 0, declined: 0, errors: [] };

  for (const profile of dueProfiles || []) {
    const planKey = profile.subscription_plan;
    // Determina el ciclo por la diferencia real entre el vencimiento anterior
    // y "ahora": si faltan >60 días es que era anual, si no, mensual.
    // (No guardamos `billing` por perfil hoy — se infiere del propio ciclo
    // vencido, igual de confiable porque activatePlanForUser recalcula la
    // próxima fecha a partir de este valor.)
    const prevExpiry = new Date(profile.subscription_expires_at);
    const billing = (now - prevExpiry) > 1000 * 60 * 60 * 24 * 60 ? 'annual' : 'monthly';
    const cfg = WOMPI_PLANS[planKey]?.[billing];
    if (!cfg) continue; // plan Enterprise a medida u otro caso sin precio fijo — se gestiona a mano

    results.attempted++;
    const reference = `bitafly_renew_${planKey}_${billing}_${profile.id}_${Date.now()}`;

    try {
      const { data: tx } = await createRecurringTransaction({
        paymentSourceId: profile.wompi_payment_source_id,
        amountInCents: cfg.amount * 100,
        currency: 'COP',
        customerEmail: profile.email,
        reference,
      });

      if (tx.status === 'APPROVED') {
        await activatePlanForUser(admin, {
          userId: profile.id,
          planKey,
          billing,
          subscriptionId: tx.id,
          ref: reference,
          provider: 'wompi',
          wompiPaymentSourceId: profile.wompi_payment_source_id,
        });
        results.renewed++;
      } else {
        results.declined++;
        console.log(`[wompi-cron] cobro declinado: user=${profile.id} status=${tx.status}`);
      }
    } catch (chargeErr) {
      results.declined++;
      results.errors.push({ userId: profile.id, message: chargeErr.message });
      console.error(`[wompi-cron] error cobrando user=${profile.id}:`, chargeErr.message);
    }
  }

  console.log('[wompi-cron] resultado:', JSON.stringify(results));
  return NextResponse.json(results);
}
