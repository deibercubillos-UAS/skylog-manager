// GET /api/cron/notifications-daily — Vercel Cron (diario, V2).
// (a) Avisos de vencimiento (pólizas y CDO-U) a admin/gerente_sms/jefe_pilotos de cada organización, una vez por semana
//     por alerta (la clave de deduplicación incluye la semana).
// (b) Limpieza: borra notificaciones leídas de más de 60 días y cualquiera de más de 180.
// Secured con Authorization: Bearer CRON_SECRET.
import { createAdminClient } from '@/lib/supabaseServer';
import { bogotaDay } from '@/lib/v2/dispatchContext';
import { createNotifications } from '@/lib/v2/notify';
import { computeExpiryAlerts, expiryAlertToNotification, NOTIFICATION_MAX_AGE_DAYS, NOTIFICATION_READ_MAX_AGE_DAYS } from '@skylog/domain';

export const dynamic = 'force-dynamic';

function verifyAuth(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (request.headers.get('authorization') || '') === `Bearer ${secret}`;
}

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

export async function GET(request) {
  if (!verifyAuth(request)) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const admin = createAdminClient();
  const today = bogotaDay(new Date());

  const [{ data: policies }, { data: certs }] = await Promise.all([
    admin.from('insurance_policies').select('*'),
    admin.from('organization_certifications').select('*'),
  ]);
  const byOrg = new Map();
  const bucket = (id) => {
    if (!byOrg.has(id)) byOrg.set(id, { policies: [], cert: null });
    return byOrg.get(id);
  };
  for (const p of policies || []) bucket(p.organization_id).policies.push(p);
  for (const c of certs || []) bucket(c.organization_id).cert = c;

  let created = 0;
  for (const [organizationId, { policies: pols, cert }] of byOrg) {
    const alerts = computeExpiryAlerts({ policies: pols, cert }, today);
    for (const alert of alerts) {
      const n = expiryAlertToNotification(alert, today);
      const out = await createNotifications({
        organizationId,
        roles: ['admin', 'gerente_sms', 'jefe_pilotos'],
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        dedupeKey: n.dedupeKey,
      }, admin);
      created += out.created || 0;
    }
  }

  const { count: oldRead } = await admin.from('notifications').delete({ count: 'exact' }).not('read_at', 'is', null).lt('created_at', daysAgo(NOTIFICATION_READ_MAX_AGE_DAYS));
  const { count: oldAny } = await admin.from('notifications').delete({ count: 'exact' }).lt('created_at', daysAgo(NOTIFICATION_MAX_AGE_DAYS));

  return Response.json({ today, created, cleaned: (oldRead || 0) + (oldAny || 0) });
}
