/**
 * POST /api/auth/activate-pending
 *
 * Verificación manual de pago para el flujo "pago antes de crear cuenta".
 * El usuario hace clic en "Ya pagué / Verificar" en la pantalla de espera.
 *
 * 1. Comprueba si el pending_registration ya fue marcado como completado (webhook funcionó).
 * 2. Si no, consulta la lista de suscripciones de ePayco buscando el email del pending.
 * 3. Si encuentra suscripción activa → crea la cuenta y marca el pending como completado.
 *
 * No requiere autenticación (el usuario aún no tiene cuenta).
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { listSubscriptions, resolveSubscriptionEmail } from '@/lib/epayco';
import { createAccountFromPendingRegistration } from '@/lib/epaycoActivation';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Rate limit: 10 intentos por IP por hora
    const ip = getClientIp(request);
    const { allowed } = checkRateLimit(`activate-pending:${ip}`, { limit: 10, windowMs: 3_600_000 });
    if (!allowed) return NextResponse.json({ error: 'Demasiados intentos.' }, { status: 429 });

    const { ref } = await request.json();
    if (!ref) return NextResponse.json({ error: 'ref requerido' }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    // 1. Buscar pending_registration por nuestra referencia interna
    const { data: pending } = await supabase
      .from('pending_registrations')
      .select('id, email, plan_key, billing, completed_at, expires_at')
      .eq('reference', ref)
      .maybeSingle();

    if (!pending) return NextResponse.json({ status: 'not_found' });

    // ¿Ya completado? (el webhook corrió correctamente)
    if (pending.completed_at) {
      return NextResponse.json({ status: 'completed', plan_key: pending.plan_key });
    }

    // ¿Expirado?
    if (new Date(pending.expires_at) < new Date()) {
      return NextResponse.json({ status: 'expired' });
    }

    // 2. Consultar ePayco para ver si hay suscripción activa para este email
    const email = pending.email.trim().toLowerCase();

    try {
      const subscriptions = await listSubscriptions();

      // ⚠️ GET /recurring/v1/subscriptions/{apiKey} NUNCA trae el email del
      // cliente directo (solo un idCustomer opaco) — bug real confirmado
      // 2026-07-26 (ver nota en lib/epayco.js#resolveSubscriptionEmail).
      // Comparar contra s.email/s.customer_data.email/etc. siempre fallaba en
      // silencio, aunque la suscripción SÍ existiera y estuviera activa en
      // ePayco. Se resuelve el email real por idCustomer, con caché en este
      // request para no repetir la búsqueda si hay varias suscripciones.
      const ACTIVE_STATES = ['active', '1', 'activa', 'activo', 'approved', 'aprobado'];
      const emailCache = new Map();

      let activeSub = null;
      for (const s of subscriptions) {
        const stateRaw = String(s.status || s.state || '').toLowerCase();
        const isActive = !stateRaw || ACTIVE_STATES.some(a => stateRaw.includes(a));
        if (!isActive) continue;

        const subEmail = await resolveSubscriptionEmail(s, emailCache);
        if (subEmail === email) { activeSub = s; break; }
      }

      if (activeSub) {
        const subId = activeSub.id || activeSub.uid || activeSub._id || activeSub.subscription_id || null;

        const userId = await createAccountFromPendingRegistration(supabase, pending.email, {
          planKey:        pending.plan_key,
          billing:        pending.billing,
          subscriptionId: subId,
          ref:            null,
        });

        if (userId) {
          console.log(`[epayco] ✓ activate-pending — Cuenta creada manualmente: user=${userId} plan=${pending.plan_key}`);
          return NextResponse.json({ status: 'completed', plan_key: pending.plan_key });
        }
      }
    } catch (epaycoErr) {
      // No-crítico: si la API de ePayco falla, devolvemos 'pending' para que el usuario
      // pueda volver a intentar o contactar soporte.
      console.warn('[activate-pending] ePayco check failed:', epaycoErr.message);
    }

    // 3. Aún pendiente — no se encontró suscripción activa
    return NextResponse.json({ status: 'pending' });

  } catch (err) {
    console.error('[activate-pending]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
