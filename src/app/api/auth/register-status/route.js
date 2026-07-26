/**
 * GET /api/auth/register-status?ref=REFERENCE
 *
 * Polling endpoint para la pantalla de "Esperando pago".
 * Devuelve el estado de un pending_registration sin exponer datos sensibles.
 *
 * ⚠️ Bug real confirmado (2026-07-26): esta ruta solo LEÍA
 * pending_registrations.completed_at — nunca lo escribía. Esa columna solo
 * la actualiza el webhook de ePayco (que puede no llegar nunca, ver
 * api/epayco/webhook) o activate-pending (el botón manual "Ya pagué"). Efecto
 * real: el polling automático de la pantalla de espera JAMÁS detectaba un
 * pago confirmado por sí solo — el usuario siempre tenía que hacer clic
 * manualmente en "Ya pagué" para que algo verificara con ePayco de verdad.
 * Ahora reutiliza la misma reconciliación real (reconcilePendingRegistration)
 * que ya usa activate-pending, con el mismo rate limit generoso (60/min) que
 * ya tenía esta ruta — pensado para el sondeo automático cada ~4-5s.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { reconcilePendingRegistration } from '@/lib/epaycoActivation';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Endpoint público de polling sin auth: acota el sondeo de referencias.
    // 60/min por IP (la pantalla real sondea cada ~4s, muy por debajo de esto).
    const ip = getClientIp(request);
    const { allowed } = checkRateLimit(`register-status:${ip}`, { limit: 60, windowMs: 60_000 });
    if (!allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta más tarde.' }, { status: 429 });
    }

    const ref = new URL(request.url).searchParams.get('ref');
    if (!ref) return NextResponse.json({ error: 'ref requerido' }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data } = await supabase
      .from('pending_registrations')
      .select('id, email, completed_at, expires_at, plan_key, billing')
      .eq('reference', ref)
      .maybeSingle();

    if (!data) return NextResponse.json({ status: 'not_found' });

    if (data.completed_at) {
      return NextResponse.json({ status: 'completed', plan_key: data.plan_key });
    }

    if (new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ status: 'expired' });
    }

    // Verificación real con ePayco (no solo lectura pasiva — ver nota arriba).
    try {
      const userId = await reconcilePendingRegistration(supabase, data);
      if (userId) {
        console.log(`[epayco] ✓ register-status — Cuenta activada por polling: user=${userId} plan=${data.plan_key}`);
        return NextResponse.json({ status: 'completed', plan_key: data.plan_key });
      }
    } catch (epaycoErr) {
      // No-crítico: si ePayco falla transitoriamente, el próximo tick del
      // polling (cada ~4-5s) lo reintenta solo.
      console.warn('[register-status] ePayco check failed:', epaycoErr.message);
    }

    return NextResponse.json({ status: 'pending' });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
