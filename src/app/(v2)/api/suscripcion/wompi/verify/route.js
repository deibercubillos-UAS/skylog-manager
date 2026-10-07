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

  // Idempotencia — comparte el mismo libro `wompi_processed_refs` que el
  // webhook a propósito: son dos puertas a la MISMA activación, así que una
  // transacción ya procesada por el webhook no debe volver a activarse aquí.
  // Sin esta guarda, `activateSubscription` recalcula
  // `expires_at = now + 1 periodo` en cada llamada, y cualquier miembro podía
  // reenviar un transactionId aprobado una vez al mes para renovar
  // indefinidamente sin volver a pagar.
  const { data: already } = await admin
    .from('wompi_processed_refs')
    .select('tx_id')
    .eq('tx_id', tx.id)
    .maybeSingle();
  if (already) {
    // No es un error: el caso legítimo es que el webhook ya activó y el
    // usuario pega el id porque no lo ve reflejado. Se le devuelve el estado
    // real en vez de reactivar.
    const { data: subscription } = await admin
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();
    return Response.json({ status: 'completed', subscription, alreadyProcessed: true });
  }

  const subscription = await activateSubscription(admin, {
    organizationId,
    plan,
    billing,
    transactionId: tx.id,
    reference: tx.reference,
    wompiPaymentSourceId: tx.payment_source_id ? String(tx.payment_source_id) : null,
    amountInCents: tx.amount_in_cents,
  });

  // Se marca DESPUÉS de activar con éxito, misma convención que el webhook y
  // que v1 (`processed_webhook_refs`): marcarlo antes bloquearía un reintento
  // legítimo si la activación falla.
  const { error: markError } = await admin.from('wompi_processed_refs').insert({ tx_id: tx.id });
  if (markError) {
    // No se le falla al usuario: su suscripción ya quedó activa. Pero queda en
    // logs, porque sin el marcador la guarda de arriba no protege esta tx.
    console.error('[wompi-v2] verify: no se pudo marcar la tx como procesada:', tx.id, markError.message);
  }

  return Response.json({ status: 'completed', subscription });
}
