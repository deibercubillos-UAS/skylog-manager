// Skylog V2.0 — perfiles gratis que regala un socio (Etapa E2). GET lista los de su escuela/asesoría, POST regala uno
// a un correo (cupo, un regalo por correo y solo para quien aún no tiene cuenta) y DELETE (solo el dueño) lo anula y
// libera el cupo. El cupo se reserva en una función atómica de la base: dos solicitudes simultáneas no lo exceden.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { adminKeyProblem } from '@/lib/v2/adminKey';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { resolvePartnerMember, sendGrantEmail } from '@/lib/v2/grantsServer';
import { newPartnerToken } from '@/lib/v2/partnersServer';
import { likeExact } from '@/lib/v2/invitationsServer';
import { grantSeatsCheck, grantDates } from '@skylog/domain';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function session() {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  const { error, personId } = await resolveCurrentPerson(supabase, user.id);
  if (error || !personId) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  const admin = createAdminClient();
  const member = await resolvePartnerMember(admin, personId);
  if (!member) return { error: Response.json({ error: 'No es socio' }, { status: 403 }) };
  return { admin, member, personId };
}

export async function GET() {
  const s = await session();
  if (s.error) return s.error;
  const { data, error } = await s.admin.from('free_grants').select('id, email, status, granted_at, expires_at, redeemed_organization_id').eq('partner_id', s.member.partner_id).order('granted_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ grants: data || [] });
}

export async function POST(request) {
  const s = await session();
  if (s.error) return s.error;
  if (!checkRateLimit(`regalo:${s.personId}:${getClientIp(request)}`, { limit: 30, windowMs: 3_600_000 }).allowed) {
    return Response.json({ error: 'Demasiados regalos en poco tiempo. Intenta más tarde.' }, { status: 429 });
  }
  if (adminKeyProblem()) return Response.json({ error: 'El servicio no está disponible por ahora.' }, { status: 503 });

  const { email: raw } = await request.json().catch(() => ({}));
  const email = String(raw || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return Response.json({ error: 'Correo inválido' }, { status: 400 });

  const partner = s.member.partner;
  const seats = grantSeatsCheck(partner);
  if (!seats.ok) return Response.json({ error: seats.message, reason: seats.reason }, { status: seats.reason === 'sin_cupo' ? 409 : 403 });

  // El perfil gratis es solo para usuarios nuevos: una persona que ya tiene cuenta no puede recibirlo.
  const { data: person } = await s.admin.from('people').select('id').ilike('email', likeExact(email)).limit(1).maybeSingle();
  if (person) {
    const { data: account } = await s.admin.from('accounts').select('id').eq('person_id', person.id).maybeSingle();
    if (account) return Response.json({ error: 'Ya existe una cuenta con ese correo. El perfil gratis es solo para usuarios nuevos.' }, { status: 409 });
  }

  const token = newPartnerToken();
  const dates = grantDates(partner.free_days);
  const { data: created, error } = await s.admin.rpc('v2_create_free_grant', { p: { partner_id: partner.id, advisor_member_id: s.member.id, email, token, ...dates } });
  if (error) {
    const msg = error.message || '';
    if (/ya recibi/i.test(msg)) return Response.json({ error: 'Este correo ya recibió un perfil gratis anteriormente y no es renovable.' }, { status: 409 });
    if (/cupos/i.test(msg)) return Response.json({ error: 'Se agotaron los cupos de perfiles gratis.' }, { status: 409 });
    if (/no est/i.test(msg)) return Response.json({ error: 'El socio no está activo.' }, { status: 403 });
    console.error('[regalos] v2_create_free_grant falló:', msg);
    return Response.json({ error: 'No se pudo crear el regalo. Intenta de nuevo.' }, { status: 500 });
  }
  const mail = await sendGrantEmail({ to: email, partner: { name: partner.name, logo_url: partner.logo_url }, freeDays: partner.free_days, token });
  return Response.json({ success: true, grant_id: created.grant_id, emailSent: mail.sent });
}

export async function DELETE(request) {
  const s = await session();
  if (s.error) return s.error;
  if (s.member.role !== 'owner') return Response.json({ error: 'Solo el administrador puede anular perfiles regalados.' }, { status: 403 });
  const { grant_id } = await request.json().catch(() => ({}));
  if (!grant_id) return Response.json({ error: 'grant_id requerido' }, { status: 400 });

  const { data, error } = await s.admin.rpc('v2_delete_free_grant', { p_grant: grant_id, p_partner: s.member.partner_id });
  if (error) return Response.json({ error: /no encontrado/i.test(error.message) ? 'Regalo no encontrado.' : 'No se pudo anular el regalo.' }, { status: /no encontrado/i.test(error.message) ? 404 : 500 });

  // Si ya fue canjeado, se revoca el beneficio: la suscripción de esa organización vence hoy (solo si sigue siendo la del regalo).
  if (data?.redeemed_organization_id) {
    const today = new Date().toISOString().slice(0, 10);
    await s.admin.from('subscriptions').update({ expires_at: today }).eq('organization_id', data.redeemed_organization_id).like('notes', 'Regalo de socio:%');
  }
  return Response.json({ success: true });
}
