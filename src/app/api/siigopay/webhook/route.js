import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(request) {
  try {
    // ── Guard: el secreto DEBE estar configurado ─────────────────────────────
    // Si no está definido, cualquier petición pasaría la verificación de firma
    // (undefined.toString() = "undefined" → firma predecible). Rechazamos todo.
    const webhookSecret = process.env.SIIGOPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('SIIGOPAY_WEBHOOK_SECRET no está configurado en las variables de entorno');
      return NextResponse.json({ error: 'Webhook no configurado en el servidor' }, { status: 500 });
    }

    const body = await request.text();
    const signature = request.headers.get('x-siigopay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Firma ausente' }, { status: 401 });
    }

    // ── Comparación en tiempo constante (previene timing attacks) ───────────
    const expectedSig = crypto
      .createHash('sha256')
      .update(body + webhookSecret)
      .digest('hex');

    // timingSafeEqual requiere buffers del mismo tamaño.
    // Comparamos los hex strings como ASCII buffers (SHA-256 siempre = 64 chars).
    const sigBuffer = Buffer.from(signature.toLowerCase().trim());
    const expBuffer = Buffer.from(expectedSig.toLowerCase());

    const signaturesMatch =
      sigBuffer.length === expBuffer.length &&
      crypto.timingSafeEqual(sigBuffer, expBuffer);

    if (!signaturesMatch) {
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

    // Actualizar plan en Supabase con Service Role (bypasa RLS intencionalmente)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_plan: planKey,
        wompi_subscription_ref: reference,       // ← nombre real del campo en la BD
        subscription_expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error actualizando suscripción:', updateError.message);
      throw updateError;
    }

    console.log(`Suscripción activada: usuario=${userId} plan=${planKey} billing=${billing}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('SIIGO PAY webhook error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
