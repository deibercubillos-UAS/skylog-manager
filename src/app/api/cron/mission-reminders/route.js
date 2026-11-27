// GET /api/cron/mission-reminders — Vercel Cron (cada 5 min, V2).
// Recordatorio de vuelo: avisa al PIC y al observador ~15 minutos antes de la hora
// programada de cada misión todavía en estado 'programada'. Se dispara una sola vez por
// misión y persona gracias a la clave de deduplicación (índice único parcial
// person_id + dedupe_key). El aviso llega a la campana de la app, igual que
// 'mision_programada' que se crea al programarla.
//
// Ventana: misiones cuya hora está entre ahora y ahora+15 min (aún no empiezan). Como el
// cron corre cada 5 min, el recordatorio sale entre ~15 y ~10 min antes; el dedupe evita
// repetirlo en las siguientes pasadas. No toca misiones canceladas ni ya pasadas.
// Secured con Authorization: Bearer CRON_SECRET.
import { isCronAuthorized } from '@/lib/safeEqual';
import { createAdminClient } from '@/lib/supabaseServer';
import { createNotifications } from '@/lib/v2/notify';

export const dynamic = 'force-dynamic';

const REMINDER_WINDOW_MS = 15 * 60 * 1000;

// Hora local (Bogotá) legible para el cuerpo del aviso, p. ej. "02:45 p. m.".
const bogotaTime = (date) => new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' }).format(date);

export async function GET(request) {
  if (!isCronAuthorized(request)) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const admin = createAdminClient();
  const now = new Date();
  const until = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const { data: missions, error } = await admin
    .from('missions')
    .select('id, organization_id, pic_person_id, observer_person_id, name, zone, scheduled_at')
    .eq('status', 'programada')
    .gt('scheduled_at', now.toISOString())
    .lte('scheduled_at', until.toISOString());
  if (error) return Response.json({ error: 'No se pudieron leer las misiones' }, { status: 500 });

  let created = 0;
  for (const m of missions || []) {
    const recipients = [m.pic_person_id, m.observer_person_id].filter(Boolean);
    if (!recipients.length) continue;
    const out = await createNotifications({
      organizationId: m.organization_id,
      personIds: recipients,
      type: 'mision_recordatorio',
      title: `Tu vuelo empieza pronto: ${m.name || 'Misión'}`,
      body: [m.zone, `Hora ${bogotaTime(new Date(m.scheduled_at))}`].filter(Boolean).join(' · '),
      link: '/operacion/programacion',
      dedupeKey: `mision_recordatorio:${m.id}`,
    }, admin);
    created += out.created || 0;
  }

  return Response.json({ scanned: (missions || []).length, created });
}
