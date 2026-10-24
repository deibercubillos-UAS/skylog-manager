// Skylog V2.0 — POST /api/suscripcion/wompi/verify
// Red de seguridad manual: si el webhook no llegó, el usuario autenticado
// puede pegar el ID de transacción (visible al terminar de pagar en el
// Widget) para verificar el estado directamente contra Wompi y activar.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { getTransaction } from '@/lib/wompi';
import { activateFromWompiTransaction } from '@/lib/v2/subscriptionActivation';
import { getAuthUser } from '@/lib/v2/authUser';
import { isPlayAppRequest } from '@/lib/v2/playApp';

export async function POST(request) {
  if (isPlayAppRequest(request)) return Response.json({ error: 'Los pagos no están disponibles en esta aplicación' }, { status: 403 });
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
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

  const admin = createAdminClient();
  // Misma activación que el webhook: valida referencia, organización y monto, y no activa dos veces el mismo pago.
  const result = await activateFromWompiTransaction(admin, tx, { allowedOrganizationIds: organizationIds || [] });
  if (result.status === 'unknown_reference') return Response.json({ error: 'Esta transacción no corresponde a BitaFly' }, { status: 400 });
  if (result.status === 'forbidden') return Response.json({ error: 'Esta transacción no corresponde a tu organización' }, { status: 403 });
  if (result.status === 'amount_mismatch') return Response.json({ error: 'El monto pagado no corresponde al plan. Escríbenos a soporte@bitafly.com.' }, { status: 400 });
  if (result.status === 'already_processed') {
    const { data: subscription } = await admin.from('subscriptions').select('*').eq('organization_id', result.resolved.organizationId).maybeSingle();
    return Response.json({ status: 'completed', subscription, alreadyProcessed: true });
  }
  return Response.json({ status: 'completed', subscription: result.subscription });
}
