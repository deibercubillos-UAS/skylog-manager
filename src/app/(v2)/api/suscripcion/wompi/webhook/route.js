// Skylog V2.0 — POST /api/suscripcion/wompi/webhook
// Wompi envía `transaction.updated` con un checksum SHA-256 (properties +
// timestamp + WOMPI_EVENTS_SECRET) — ver src/lib/wompi.js#verifyWebhookChecksum.
// Debe responder 200 rápido; Wompi reintenta 3 veces en 24h si no.
// La activación (referencia, monto, una sola vez) vive en activateFromWompiTransaction, compartida con /verify y el cron.
import { createAdminClient } from '@/lib/supabaseServer';
import { verifyWebhookChecksum, getTransaction } from '@/lib/wompi';
import { activateFromWompiTransaction, resolveWompiReference } from '@/lib/v2/subscriptionActivation';
import { createNotifications } from '@/lib/v2/notify';
import { parseWompiReference } from '@skylog/domain';

export async function GET() {
  return Response.json({ ok: true });
}

export async function POST(request) {
  try {
    const event = await request.json().catch(() => null);
    if (!event || typeof event !== 'object') return Response.json({ error: 'Cuerpo inválido' }, { status: 400 });

    console.log('[wompi-v2] webhook recibido:', JSON.stringify({
      event: event?.event,
      txId: event?.data?.transaction?.id,
      status: event?.data?.transaction?.status,
      reference: event?.data?.transaction?.reference,
    }));

    let checksumOk;
    try {
      checksumOk = verifyWebhookChecksum(event);
    } catch (err) {
      // Falta WOMPI_EVENTS_SECRET: es de configuración, no de la petición — 503 y no un 500 que parezca un fallo del código.
      console.error('[wompi-v2] webhook: sin configuración para verificar la firma:', err.message);
      return Response.json({ error: 'Servicio no disponible por ahora' }, { status: 503 });
    }
    if (!checksumOk) {
      console.error('[wompi-v2] webhook: checksum inválido');
      return Response.json({ error: 'Checksum inválido' }, { status: 401 });
    }

    if (event.event !== 'transaction.updated') {
      return Response.json({ received: true });
    }

    const eventTx = event.data?.transaction;
    if (!eventTx?.id) return Response.json({ error: 'Cuerpo inválido' }, { status: 400 });
    const admin = createAdminClient();

    if (eventTx.status !== 'APPROVED') {
      // Un cobro recurrente que Wompi termina rechazando (PENDING → DECLINED) se le avisa al Gerente General.
      if (['DECLINED', 'ERROR', 'VOIDED'].includes(eventTx.status) && parseWompiReference(eventTx.reference)?.kind === 'renewal') {
        await notifyRenewalFailed(admin, eventTx.reference);
      }
      return Response.json({ received: true });
    }

    // La firma prueba que el evento es de Wompi, pero lo que activa un plan es lo que Wompi dice AHORA de esa
    // transacción: se vuelve a consultar por su id y se usa esa respuesta (no el cuerpo del evento). Si Wompi no
    // responde, 503: Wompi reintenta y el pago no se pierde.
    let tx;
    try {
      tx = await getTransaction(eventTx.id);
    } catch (err) {
      console.error('[wompi-v2] webhook: no se pudo reconsultar la transacción', eventTx.id, err.message);
      return Response.json({ error: 'No se pudo confirmar la transacción' }, { status: 503 });
    }
    if (String(tx?.id) !== String(eventTx.id) || tx.reference !== eventTx.reference) {
      console.error('[wompi-v2] webhook: la transacción consultada no coincide con el evento. tx:', eventTx.id);
      return Response.json({ received: true, status: 'not_confirmed' });
    }
    if (tx.status !== 'APPROVED') {
      // El evento dice aprobada y Wompi aún no: se pide el reintento en vez de perder el pago.
      console.error('[wompi-v2] webhook: el evento dice APPROVED pero la consulta dice', tx.status, 'tx:', eventTx.id);
      return Response.json({ error: 'Transacción aún no confirmada' }, { status: 503 });
    }

    const result = await activateFromWompiTransaction(admin, tx);
    if (result.status === 'already_processed') {
      console.log(`[wompi-v2] webhook duplicado ignorado: tx=${tx.id}`);
    } else if (result.status === 'unknown_reference') {
      console.error('[wompi-v2] webhook: no se pudo identificar organización/plan. reference:', tx.reference);
    } else if (result.status === 'amount_mismatch') {
      console.error('[wompi-v2] webhook: el monto no coincide con el plan; NO se activó. tx:', tx.id, 'ref:', tx.reference, 'monto:', tx.amount_in_cents);
    } else {
      console.log(`[wompi-v2] ✓ Suscripción activada: org=${result.resolved.organizationId} plan=${result.resolved.plan} billing=${result.resolved.billing}`);
    }
    // 200 en todos los casos manejados: reintentar no cambiaría el resultado. Solo un error inesperado devuelve 500.
    return Response.json({ received: true, status: result.status });
  } catch (err) {
    console.error('[wompi-v2] webhook error:', err.message);
    return Response.json({ error: 'Error procesando el evento' }, { status: 500 });
  }
}

async function notifyRenewalFailed(admin, reference) {
  const resolved = await resolveWompiReference(admin, reference);
  if (!resolved) return;
  await createNotifications({
    organizationId: resolved.organizationId,
    roles: ['admin'],
    type: 'vencimiento',
    title: 'No se pudo renovar la suscripción con tu tarjeta',
    body: 'El banco rechazó el cobro automático. Paga desde Suscripción para mantener tu plan activo.',
    link: '/suscripcion',
    dedupeKey: `renovacion-fallida:${reference}`,
  }, admin);
}
