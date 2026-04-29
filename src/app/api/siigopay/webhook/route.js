import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Pendiente: configurar SIIGOPAY_WEBHOOK_SECRET en variables de entorno
export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-siigopay-signature');

    // Verificar firma del evento
    const webhookSecret = process.env.SIIGOPAY_WEBHOOK_SECRET;
    const expectedSig = crypto
      .createHash('sha256')
      .update(body + webhookSecret)
      .digest('hex');

    if (signature !== expectedSig) {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
    }

    const event = JSON.parse(body);

    // Solo procesar transacciones aprobadas
    if (
      event.event !== 'transaction.updated' ||
      event.data?.transaction?.status !== 'APPROVED'
    ) {
      return NextResponse.json({ received: true });
    }

    const transaction = event.data.transaction;
    const reference = transaction.reference; // bitafly_{plan}_{billing}_{userId}_{ts}

    // Parsear referencia
    const parts = reference.split('_');
    if (parts.length < 5 || parts[0] !== 'bitafly') {
      return NextResponse.json({ error: 'Referencia inválida' }, { status: 400 });
    }

    const planKey = parts[1];
    const billing = parts[2];
    const userId = parts[3];

    // Calcular fecha de expiración
    const now = new Date();
    const expiresAt = new Date(now);
    if (billing === 'annual') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // Actualizar plan en Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    await supabase
      .from('profiles')
      .update({
        subscription_plan: planKey,
        siigopay_subscription_ref: reference,
        subscription_expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('SIIGO PAY webhook error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
