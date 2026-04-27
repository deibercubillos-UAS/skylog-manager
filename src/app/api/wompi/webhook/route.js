import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const body = await request.text();
    const wompiSignature = request.headers.get('x-event-checksum');

    // 1. Verificar firma del evento
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
    const expectedSig = crypto
      .createHash('sha256')
      .update(body + eventsSecret)
      .digest('hex');

    if (wompiSignature !== expectedSig) {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
    }

    const event = JSON.parse(body);

    // 2. Solo procesar transacciones aprobadas
    if (
      event.event !== 'transaction.updated' ||
      event.data?.transaction?.status !== 'APPROVED'
    ) {
      return NextResponse.json({ received: true });
    }

    const transaction = event.data.transaction;
    const reference = transaction.reference; // bitafly_{plan}_{billing}_{userId}_{ts}

    // 3. Parsear referencia para saber qué plan y qué usuario
    const parts = reference.split('_');
    // format: bitafly_{planKey}_{billing}_{userId}_{timestamp}
    if (parts.length < 5 || parts[0] !== 'bitafly') {
      return NextResponse.json({ error: 'Referencia inválida' }, { status: 400 });
    }

    const planKey = parts[1];
    const billing = parts[2];
    const userId = parts[3];

    // 4. Calcular fecha de expiración
    const now = new Date();
    const expiresAt = new Date(now);
    if (billing === 'annual') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // 5. Actualizar plan en Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    await supabase
      .from('profiles')
      .update({
        subscription_plan: planKey,
        wompi_subscription_ref: reference,
        subscription_expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Wompi webhook error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
