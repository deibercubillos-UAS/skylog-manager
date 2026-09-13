// POST /api/wompi/verify — reemplaza /api/epayco/verify.
// Red de seguridad manual: si el webhook no llegó, el usuario autenticado
// puede pegar el ID de transacción (visible en el widget al terminar de
// pagar) para verificar el estado directamente contra Wompi y activar.
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClientSSR } from '@/lib/supabaseServer';
import { getTransaction } from '@/lib/wompi';
import { activatePlanForUser } from '@/lib/epaycoActivation';

export async function POST(request) {
  const supabase = await createClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { transactionId } = await request.json();
  if (!transactionId) return NextResponse.json({ error: 'Falta transactionId' }, { status: 400 });

  let tx;
  try {
    tx = await getTransaction(transactionId);
  } catch {
    return NextResponse.json({ error: 'No se encontró la transacción en Wompi' }, { status: 404 });
  }

  if (tx.status !== 'APPROVED') {
    return NextResponse.json({ status: tx.status, message: 'El pago aún no se ha confirmado.' });
  }

  const refParts = String(tx.reference || '').split('_');
  if (refParts[0] !== 'bitafly' || refParts[3] !== user.id) {
    return NextResponse.json({ error: 'Esta transacción no corresponde a tu cuenta.' }, { status: 403 });
  }
  const [, planKey, billing] = refParts;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  await activatePlanForUser(admin, {
    userId: user.id,
    planKey,
    billing,
    subscriptionId: tx.id,
    ref: tx.reference,
    provider: 'wompi',
    wompiPaymentSourceId: tx.payment_source_id ? String(tx.payment_source_id) : null,
  });

  return NextResponse.json({ status: 'completed' });
}
