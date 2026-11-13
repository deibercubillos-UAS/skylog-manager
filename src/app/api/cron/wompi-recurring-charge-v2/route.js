// GET /api/cron/wompi-recurring-charge-v2 — Vercel Cron (diario). Cobra la renovación de las suscripciones pagadas con
// tarjeta (Wompi no cobra solo: esta app dispara cada cobro con la tarjeta ya tokenizada, `wompi_payment_source_id`).
//
// Reglas (packages/domain/src/subscriptionRenewal.js, auditoría 2026-10-16 C2):
// - Máximo 3 intentos por ciclo, separados al menos 3 días; un ciclo vencido hace más de 15 días no se empieza a cobrar.
// - Cada intento se registra en `pending_subscriptions` ANTES de cobrar, con una referencia fija por ciclo e intento:
//   si dos ejecuciones coinciden, la segunda choca con la llave primaria y no cobra.
// - Aprobado al instante → se activa aquí (activateFromWompiTransaction, la misma del webhook: no activa dos veces).
//   Pendiente → lo termina el webhook. Rechazado → se avisa al Gerente General y se reintenta según la política.
//
// Protegido con Authorization: Bearer CRON_SECRET.
import { isCronAuthorized } from '@/lib/safeEqual';
import { createAdminClient } from '@/lib/supabaseServer';
import { createRecurringTransaction } from '@/lib/wompi';
import { activateFromWompiTransaction } from '@/lib/v2/subscriptionActivation';
import { createNotifications } from '@/lib/v2/notify';
import { PLAN_PRICING } from '@/lib/v2/planLimits';
import { RENEWAL_POLICY, buildRenewalReference, isRenewalOfCycle, nextRenewalAttempt } from '@skylog/domain';

export const dynamic = 'force-dynamic';

const verifyAuth = isCronAuthorized;

export async function GET(request) {
  if (!verifyAuth(request)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const { data: dueSubs, error } = await admin
    .from('subscriptions')
    .select('organization_id, plan, billing, expires_at, wompi_payment_source_id')
    .eq('payment_provider', 'wompi')
    .not('wompi_payment_source_id', 'is', null)
    .lte('expires_at', now.toISOString().slice(0, 10));

  if (error) {
    console.error('[wompi-cron-v2] error consultando subscriptions:', error.message);
    return Response.json({ error: 'Error consultando las suscripciones' }, { status: 500 });
  }

  const results = { attempted: 0, renewed: 0, pending: 0, declined: 0, skipped: 0, errors: [] };

  for (const sub of dueSubs || []) {
    const cfg = PLAN_PRICING[sub.plan]?.[sub.billing];
    if (!cfg) { results.skipped++; continue; } // Enterprise u otro plan sin precio fijo — se gestiona a mano

    // Intentos ya hechos en ESTE ciclo (el ciclo es el vencimiento; cuando un pago lo extiende, empieza otro ciclo).
    const { data: rows, error: attemptsError } = await admin
      .from('pending_subscriptions')
      .select('reference, created_at')
      .eq('organization_id', sub.organization_id)
      .like('reference', 'bitafly_v2_renew_%'); // el filtro exacto por ciclo va abajo
    if (attemptsError) {
      results.errors.push({ organizationId: sub.organization_id, message: attemptsError.message });
      continue;
    }
    const attempts = (rows || [])
      .filter((r) => isRenewalOfCycle(r.reference, { organizationId: sub.organization_id, expiresAt: sub.expires_at }))
      .map((r) => ({ createdAt: r.created_at }));

    const decision = nextRenewalAttempt({ expiresAt: sub.expires_at, today: now, attempts });
    if (decision.skip) { results.skipped++; continue; }

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
    if (!account?.email) { results.skipped++; continue; } // sin Gerente General a quien cobrar/notificar

    const reference = buildRenewalReference({
      plan: sub.plan, billing: sub.billing, organizationId: sub.organization_id, expiresAt: sub.expires_at, attempt: decision.attempt,
    });
    // El registro del intento es el candado: si otra ejecución ya lo tomó, la llave primaria lo rechaza y aquí no se cobra.
    const { error: lockError } = await admin.from('pending_subscriptions').insert({
      reference, organization_id: sub.organization_id, plan: sub.plan, billing: sub.billing,
    });
    if (lockError) {
      if (lockError.code !== '23505') results.errors.push({ organizationId: sub.organization_id, message: lockError.message });
      results.skipped++;
      continue;
    }

    results.attempted++;
    try {
      const { data: tx } = await createRecurringTransaction({
        paymentSourceId: sub.wompi_payment_source_id,
        amountInCents: cfg.amount * 100,
        currency: 'COP',
        customerEmail: account.email,
        reference,
      });

      if (tx?.status === 'APPROVED') {
        // El cobro YA se hizo. Si activar falla no es un rechazo: no se avisa «el banco rechazó» ni se vuelve a cobrar
        // en el siguiente intento (antes el error caía en el catch de abajo y a los 3 días se cobraba otra vez). Se
        // cierran los intentos restantes del ciclo y queda para revisión; el webhook de Wompi también lo activa.
        try {
          const r = await activateFromWompiTransaction(admin, tx);
          if (r.status === 'activated' || r.status === 'already_processed') results.renewed++;
          else {
            results.errors.push({ organizationId: sub.organization_id, message: `aprobado pero no activado: ${r.status}` });
            await closeRemainingAttempts(admin, sub, decision.attempt);
          }
        } catch (activationErr) {
          results.errors.push({ organizationId: sub.organization_id, message: `cobrado y no activado, revisar tx ${tx.id}` });
          console.error(`[wompi-cron-v2] COBRADO pero no activado: org=${sub.organization_id} tx=${tx.id}:`, activationErr.message);
          await closeRemainingAttempts(admin, sub, decision.attempt);
        }
      } else if (tx?.status === 'PENDING') {
        results.pending++; // el webhook lo activa o avisa del rechazo
      } else {
        results.declined++;
        await notifyDeclined(admin, sub.organization_id, reference, decision.attempt);
        console.log(`[wompi-cron-v2] cobro rechazado: org=${sub.organization_id} intento=${decision.attempt} status=${tx?.status}`);
      }
    } catch (chargeErr) {
      results.declined++;
      results.errors.push({ organizationId: sub.organization_id, message: chargeErr.message });
      await notifyDeclined(admin, sub.organization_id, reference, decision.attempt);
      console.error(`[wompi-cron-v2] error cobrando org=${sub.organization_id}:`, chargeErr.message);
    }
  }

  console.log('[wompi-cron-v2] resultado:', JSON.stringify(results));
  return Response.json(results);
}

async function notifyDeclined(admin, organizationId, reference, attempt) {
  const last = attempt >= RENEWAL_POLICY.maxAttempts;
  await createNotifications({
    organizationId,
    roles: ['admin'],
    type: 'vencimiento',
    title: 'No se pudo renovar la suscripción con tu tarjeta',
    body: last
      ? 'Fue el último intento automático. Paga desde Suscripción para mantener tu plan activo.'
      : 'El banco rechazó el cobro automático. Lo intentaremos de nuevo en 3 días, o puedes pagar ya desde Suscripción.',
    link: '/suscripcion',
    dedupeKey: `renovacion-fallida:${reference}`,
  }, admin);
}

/** Marca como usados los intentos que quedan del ciclo para que el cron no vuelva a cobrar un ciclo ya cobrado. */
async function closeRemainingAttempts(admin, sub, doneAttempt) {
  const rows = [];
  for (let attempt = doneAttempt + 1; attempt <= RENEWAL_POLICY.maxAttempts; attempt++) {
    rows.push({
      reference: buildRenewalReference({ plan: sub.plan, billing: sub.billing, organizationId: sub.organization_id, expiresAt: sub.expires_at, attempt }),
      organization_id: sub.organization_id, plan: sub.plan, billing: sub.billing,
    });
  }
  if (!rows.length) return;
  const { error } = await admin.from('pending_subscriptions').upsert(rows, { onConflict: 'reference', ignoreDuplicates: true });
  if (error) console.error('[wompi-cron-v2] no se pudieron cerrar los intentos restantes; riesgo de doble cobro:', sub.organization_id, error.message);
}
