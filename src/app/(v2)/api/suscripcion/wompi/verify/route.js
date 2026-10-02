// Skylog V2.0 — POST /api/suscripcion/wompi/verify
// Red de seguridad manual: si el webhook no llegó, el usuario autenticado
// puede pegar el ID de transacción (visible al terminar de pagar en el
// Widget) para verificar el estado directamente contra Wompi y activar.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { getTransaction } from '@/lib/wompi';
import { activateSubscription } from '@/lib/v2/subscriptionActivation';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { transactionId } = await request.json().catch(() => ({}));
  if (!transactionId) return Response.json({ error: 'Falta transactionId' }, { status: 400 });

  const { error: resolveError, organizationIds } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });

  let tx;
  try {
    tx = await getTransaction(transactionId);
  } catch {
    return Response.json({ error: 'No se encontró la transacción en Wompi' }, { status: 404 });
  }

  if (tx.status !== 'APPROVED') {
    return Response.json({ status: tx.status, message: 'El pago aún no se ha confirmado.' });
  }

  const refParts = String(tx.reference || '').split('_');
  // reference = bitafly_v2_{plan}_{billing}_{organizationId}_{timestamp}
  if (refParts[0] !== 'bitafly' || refParts[1] !== 'v2') {
    return Response.json({ error: 'Esta transacción no corresponde a Skylog V2' }, { status: 400 });
  }
  const [, , plan, billing, organizationId] = refParts;
  if (!(organizationIds || []).includes(organizationId)) {
    return Response.json({ error: 'Esta transacción no corresponde a tu organización' }, { status: 403 });
  }

  const admin = createAdminClient();
  const subscription = await activateSubscription(admin, {
    organizationId,
    plan,
    billing,
    transactionId: tx.id,
    reference: tx.reference,
    wompiPaymentSourceId: tx.payment_source_id ? String(tx.payment_source_id) : null,
  });

  return Response.json({ status: 'completed', subscription });
}
