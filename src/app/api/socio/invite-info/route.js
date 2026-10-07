// Skylog V2.0 — GET /api/socio/invite-info?token= — información pública de una invitación de socio para la pantalla
// de registro (Etapa E2): a qué socio, con qué rol y para qué correo. Con límite por conexión; el token es la capacidad.
import { createAdminClient } from '@/lib/supabaseServer';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { partnerInvitationState } from '@skylog/domain';
import { likeExact } from '@/lib/v2/invitationsServer';

export const dynamic = 'force-dynamic';

const MESSAGES = { usada: 'Esta invitación ya fue aceptada.', expirada: 'Esta invitación venció. Pide que te envíen una nueva.', revocada: 'Esta invitación fue cancelada.' };

export async function GET(request) {
  if (!checkRateLimit(`invite-info:${getClientIp(request)}`, { limit: 30, windowMs: 60_000 }).allowed) {
    return Response.json({ error: 'Demasiadas solicitudes. Intenta más tarde.' }, { status: 429 });
  }
  const token = new URL(request.url).searchParams.get('token');
  if (!token || token.length > 200) return Response.json({ error: 'token requerido' }, { status: 400 });

  const admin = createAdminClient();
  const { data: inv } = await admin.from('partner_invitations').select('email, role, status, expires_at, partner:partners(name, type, status)').eq('token', token).maybeSingle();
  if (!inv) return Response.json({ error: 'Invitación no encontrada' }, { status: 404 });
  const state = partnerInvitationState(inv);
  if (state !== 'usable') return Response.json({ state, error: MESSAGES[state] }, { status: 410 });

  const { data: person } = await admin.from('people').select('id').ilike('email', likeExact(inv.email)).limit(1).maybeSingle();
  const { data: account } = person ? await admin.from('accounts').select('id').eq('person_id', person.id).maybeSingle() : { data: null };
  return Response.json({ state, partner_name: inv.partner?.name, partner_type: inv.partner?.type, role: inv.role, email: inv.email, hasAccount: !!account });
}
