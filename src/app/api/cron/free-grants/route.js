// GET /api/cron/free-grants — Vercel Cron (diario 13:30 UTC). V2 (Etapa E2): marca como `degradado` todo regalo de
// socio vencido (canjeado o sin canjear) y avisa por correo al beneficiario. El plan no se «baja» aquí: la
// suscripción de la organización ya quedó con el vencimiento del regalo al canjearse, así que el servicio se limita
// solo (mismo gate que cualquier suscripción vencida).
//
// DECISIÓN PENDIENTE — purga: la versión actual borraba los datos operacionales 90 días después. En V2 eso choca con la
// retención obligatoria de 5 años (vuelos, mantenimiento, SMS) y con las retenciones legales, así que NO se borra nada
// automáticamente: `purge_after` se conserva y la purga queda sin implementar hasta decidir qué se puede eliminar.
//
// Protegido con Authorization: Bearer CRON_SECRET.
import { createAdminClient } from '@/lib/supabaseServer';
import { sendGrantExpiredEmail } from '@/lib/v2/grantsServer';

export const dynamic = 'force-dynamic';

function verifyAuth(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (request.headers.get('authorization') || '') === `Bearer ${secret}`;
}

export async function GET(request) {
  if (!verifyAuth(request)) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const results = { degraded: 0, emailed: 0, errors: [] };

  const { data: expired, error } = await admin
    .from('free_grants')
    .select('id, email, status, partner:partners(name)')
    .in('status', ['activado', 'enviado'])
    .lte('expires_at', now);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  for (const grant of expired || []) {
    try {
      // Solo se avisa a quien llegó a usar el regalo; el que nunca se registró no tiene nada que perder.
      if (grant.status === 'activado') {
        const mail = await sendGrantExpiredEmail({ to: grant.email, partnerName: grant.partner?.name });
        if (mail.sent) results.emailed++;
      }
      const { error: updateError } = await admin.from('free_grants').update({ status: 'degradado' }).eq('id', grant.id);
      if (updateError) throw updateError;
      results.degraded++;
    } catch (e) {
      results.errors.push(`grant ${grant.id}: ${e.message}`);
      console.error(`[cron/free-grants] error con ${grant.id}:`, e.message);
    }
  }
  return Response.json(results);
}
