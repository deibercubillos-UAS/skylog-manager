/**
 * GET /api/auth/register-status?ref=REFERENCE
 *
 * Polling endpoint para la pantalla de "Esperando pago".
 * Devuelve el estado de un pending_registration sin exponer datos sensibles.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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
      .select('completed_at, expires_at, plan_key, billing')
      .eq('reference', ref)
      .maybeSingle();

    if (!data) return NextResponse.json({ status: 'not_found' });

    if (data.completed_at) {
      return NextResponse.json({ status: 'completed', plan_key: data.plan_key });
    }

    if (new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ status: 'expired' });
    }

    return NextResponse.json({ status: 'pending' });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
