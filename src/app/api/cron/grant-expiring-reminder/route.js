// GET /api/cron/grant-expiring-reminder — Vercel Cron (diario 10:00 UTC). V2 (Etapa E2): avisa por correo 5 días o
// menos antes de que venza un regalo de socio ya activado. `reminder_sent_at` evita repetir el aviso.
// Protegido con Authorization: Bearer CRON_SECRET.
import { createAdminClient } from '@/lib/supabaseServer';
import { sendGrantReminderEmail } from '@/lib/v2/grantsServer';
import { grantDaysLeft, GRANT_REMINDER_DAYS } from '@skylog/domain';

export const dynamic = 'force-dynamic';

function verifyAuth(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (request.headers.get('authorization') || '') === `Bearer ${secret}`;
}

export async function GET(request) {
  if (!verifyAuth(request)) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const admin = createAdminClient();
  const now = new Date();
  const limit = new Date(now.getTime() + GRANT_REMINDER_DAYS * 86_400_000).toISOString();
  const { data: grants, error } = await admin
    .from('free_grants')
    .select('id, email, expires_at, partner:partners(name)')
    .eq('status', 'activado')
    .is('reminder_sent_at', null)
    .gt('expires_at', now.toISOString())
    .lte('expires_at', limit);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const results = { reminded: 0, errors: [] };
  for (const g of grants || []) {
    const mail = await sendGrantReminderEmail({ to: g.email, daysLeft: grantDaysLeft(g.expires_at, now), partnerName: g.partner?.name });
    if (!mail.sent) {
      results.errors.push(`grant ${g.id}: correo no enviado`);
      continue; // sin marcar: se reintenta mañana
    }
    await admin.from('free_grants').update({ reminder_sent_at: now.toISOString() }).eq('id', g.id);
    results.reminded++;
  }
  return Response.json(results);
}
