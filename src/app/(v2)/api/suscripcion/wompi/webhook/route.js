// Skylog V2.0 — POST /api/suscripcion/wompi/webhook
// Wompi envía `transaction.updated` con un checksum SHA-256 (properties +
// timestamp + WOMPI_EVENTS_SECRET) — ver src/lib/wompi.js#verifyWebhookChecksum.
// Debe responder 200 rápido; Wompi reintenta 3 veces en 24h si no.
// La activación (referencia, monto, una sola vez) vive en activateFromWompiTransaction, compartida con /verify y el cron.
import { createAdminClient } from '@/lib/supabaseServer';
import { verifyWebhookChecksum } from '@/lib/wompi';
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

    const tx = event.data.transaction;
    const admin = createAdminClient();

    if (tx.status !== 'APPROVED') {
      // Un cobro recurrente que Wompi termina rechazando (PENDING → DECLINED) se le avisa al Gerente General.
      if (['DECLINED', 'ERROR', 'VOIDED'].includes(tx.status) && parseWompiReference(tx.reference)?.kind === 'renewal') {
        await notifyRenewalFailed(admin, tx.reference);
      }
      return Response.json({ received: true });
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
    return Response.json({ error: err.message }, { status: 500 });
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
