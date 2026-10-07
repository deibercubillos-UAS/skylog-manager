// Skylog V2.0 — regalos de la casa (Etapa F): acceso gratis a un correo sin cuenta, sin pasar por un socio. A
// diferencia del regalo de un socio, el superadmin puede REINICIAR el de un mismo correo (nuevo enlace y nuevas
// fechas) mientras ese correo aún no tenga cuenta; para una cuenta existente se usa el plan de la organización.
import { requireSuperadmin } from '@/lib/v2/platformAdmin';
import { adminKeyProblem } from '@/lib/v2/adminKey';
import { newPartnerToken } from '@/lib/v2/partnersServer';
import { sendGrantEmail } from '@/lib/v2/grantsServer';
import { likeExact } from '@/lib/v2/invitationsServer';
import { grantDates } from '@skylog/domain';

export const dynamic = 'force-dynamic';
const bad = (message, status = 400) => Response.json({ error: message }, { status });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function GET() {
  const g = await requireSuperadmin();
  if (g.error) return g.error;
  const { data, error } = await g.admin.from('free_grants').select('id, email, status, granted_at, expires_at, partner:partners(name)').order('granted_at', { ascending: false }).limit(100);
  if (error) return bad(error.message, 500);
  return Response.json({ grants: (data || []).map((x) => ({ ...x, partner_name: x.partner?.name || 'BitaFly' })) });
}

export async function POST(request) {
  const g = await requireSuperadmin();
  if (g.error) return g.error;
  if (adminKeyProblem()) return bad('El servicio no está disponible por ahora.', 503);
  const { email: raw, days } = await request.json().catch(() => ({}));
  const email = String(raw || '').trim().toLowerCase();
  const freeDays = days === undefined || days === '' ? 90 : Number(days);
  if (!EMAIL_RE.test(email)) return bad('Correo inválido');
  if (!Number.isInteger(freeDays) || freeDays < 1 || freeDays > 730) return bad('Los días deben estar entre 1 y 730.');

  const { data: person } = await g.admin.from('people').select('id').ilike('email', likeExact(email)).limit(1).maybeSingle();
  if (person) {
    const { data: account } = await g.admin.from('accounts').select('id').eq('person_id', person.id).maybeSingle();
    if (account) return bad('Ese correo ya tiene cuenta. Para darle más tiempo, edita el plan de su organización.', 409);
  }

  const token = newPartnerToken();
  const dates = grantDates(freeDays);
  const row = { email, plan: 'piloto', status: 'enviado', token, ...dates, partner_id: null, advisor_member_id: null, redeemed_organization_id: null, welcome_shown_at: null, reminder_sent_at: null };
  const { data: existing } = await g.admin.from('free_grants').select('id, partner_id, status').eq('email', email).maybeSingle();
  // Reiniciar un regalo de un socio devuelve su cupo.
  if (existing?.partner_id) await g.admin.rpc('v2_delete_free_grant', { p_grant: existing.id, p_partner: existing.partner_id });
  const { error } = existing && !existing.partner_id
    ? await g.admin.from('free_grants').update(row).eq('id', existing.id)
    : await g.admin.from('free_grants').insert(row);
  if (error) return bad(error.message, 500);

  const mail = await sendGrantEmail({ to: email, partner: { name: 'BitaFly' }, freeDays, token });
  return Response.json({ ok: true, reset: !!existing, emailSent: mail.sent });
}
