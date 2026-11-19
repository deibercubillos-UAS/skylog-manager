// GET /api/cron/prune-rate-limits — Vercel Cron (diario). Poda las claves vencidas del limitador
// compartido (`rate_limits`, hallazgo S3, migración 20261118140000). Las claves que se vuelven a usar
// se reinician solas en el upsert; estas son las que nadie volvió a tocar. No afecta la decisión del
// limitador. Securizado con Authorization: Bearer CRON_SECRET (como todos los cron, ver vercel.json).
import { isCronAuthorized } from '@/lib/safeEqual';
import { createAdminClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (!isCronAuthorized(request)) return Response.json({ error: 'No autorizado' }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('prune_rate_limits');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, podadas: data });
}
