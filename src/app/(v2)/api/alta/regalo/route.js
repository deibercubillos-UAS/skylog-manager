// Skylog V2.0 — información pública de un regalo para la pantalla de registro (Etapa E2): a quién se regaló, de
// parte de quién y hasta cuándo. Público y con límite por conexión; el token es la capacidad.
import { createAdminClient } from '@/lib/supabaseServer';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { loadGrant } from '@/lib/v2/grantsServer';
import { grantDaysLeft } from '@skylog/domain';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (!checkRateLimit(`regalo-info:${getClientIp(request)}`, { limit: 30, windowMs: 60_000 }).allowed) {
    return Response.json({ error: 'Demasiadas solicitudes. Intenta más tarde.' }, { status: 429 });
  }
  const token = new URL(request.url).searchParams.get('token');
  const r = await loadGrant(createAdminClient(), token);
  const messages = { inexistente: 'Este regalo no existe.', usado: 'Este regalo ya fue activado.', vencido: 'Este regalo venció.' };
  if (r.state !== 'usable') return Response.json({ state: r.state, message: messages[r.state] }, { status: r.state === 'inexistente' ? 404 : 410 });
  return Response.json({ state: 'usable', email: r.grant.email, partnerName: r.partner?.name || null, daysLeft: grantDaysLeft(r.grant.expires_at) });
}
