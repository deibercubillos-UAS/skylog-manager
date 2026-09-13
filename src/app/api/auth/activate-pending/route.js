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

    // 2. Wompi no tiene un "listado de suscripciones" que consultar (a
    // diferencia de ePayco) — su webhook (transaction.updated) es la única
    // fuente real de confirmación, y es mucho más confiable que el de ePayco
    // (motivo original de este botón manual). Si aún no llegó, sigue pendiente.
    return NextResponse.json({ status: 'pending' });

  } catch (err) {
    console.error('[activate-pending]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
