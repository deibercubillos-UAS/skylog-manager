// /api/socio/advisors — gestión de asesores de una escuela (V2, Etapa E3). Solo el dueño de una escuela.
//   GET → lista de asesores · POST { name, email } → crea el asesor (hereda comisión y cupos) y lo invita
//   DELETE { advisor_id } → desactiva al asesor y sus códigos (suave).
import { schoolOwnerContext } from '@/lib/v2/socioContext';
import { generateUniqueCode, newPartnerToken, sendMemberInvitation, sendMemberWelcome } from '@/lib/v2/partnersServer';
import { likeExact } from '@/lib/v2/invitationsServer';
import { PARTNER_INVITATION_TTL_DAYS } from '@skylog/domain';

export const dynamic = 'force-dynamic';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function GET() {
  const c = await schoolOwnerContext();
  if (c.error) return c.error;
  const { admin, school } = c;
  const { data: advisors } = await admin.from('partners').select('id, name, status, commission_pct, free_seats_used, free_seats_limit, created_at').eq('parent_partner_id', school.id).eq('type', 'asesor').order('created_at', { ascending: false });
  if (!advisors?.length) return Response.json([]);
  const ids = advisors.map((a) => a.id);
  const [{ data: codes }, { data: members }, { data: refs }, { data: grants }] = await Promise.all([
    admin.from('partner_codes').select('partner_id, code, active').in('partner_id', ids),
    admin.from('partner_members').select('partner_id, role, person:people(email, full_name)').in('partner_id', ids),
    admin.from('referrals').select('partner_id, status').in('partner_id', ids),
    admin.from('free_grants').select('partner_id, status').in('partner_id', ids),
  ]);
  const by = (rows) => (rows || []).reduce((acc, r) => ((acc[r.partner_id] ||= []).push(r), acc), {});
  const cB = by(codes), mB = by(members), rB = by(refs), gB = by(grants);
  return Response.json(advisors.map((a) => ({
    ...a,
    codes: cB[a.id] || [],
    members: (mB[a.id] || []).map((m) => ({ role: m.role, email: m.person?.email, name: m.person?.full_name })),
    stats: {
      referrals_active: (rB[a.id] || []).filter((r) => r.status === 'activa').length,
      referrals_total: (rB[a.id] || []).length,
      grants_total: (gB[a.id] || []).length,
      grants_active: (gB[a.id] || []).filter((g) => g.status === 'activado').length,
    },
  })));
}

export async function POST(request) {
  const c = await schoolOwnerContext();
  if (c.error) return c.error;
  const { admin, school, personId } = c;
  const { name, email } = await request.json().catch(() => ({}));
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (cleanName.length < 2) return Response.json({ error: 'Nombre del asesor requerido' }, { status: 400 });
  if (!EMAIL_RE.test(cleanEmail)) return Response.json({ error: 'Correo del asesor inválido' }, { status: 400 });

  const { data: advisor, error } = await admin.from('partners').insert({
    type: 'asesor', name: cleanName, parent_partner_id: school.id, commission_pct: school.commission_pct,
    free_seats_limit: school.free_seats_limit, free_days: school.free_days, status: 'activo', created_by: personId,
  }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const code = await generateUniqueCode(admin, advisor.name);
  await admin.from('partner_codes').insert({ partner_id: advisor.id, code });

  const { data: person } = await admin.from('people').select('id, full_name').ilike('email', likeExact(cleanEmail)).limit(1).maybeSingle();
  const { data: account } = person ? await admin.from('accounts').select('id').eq('person_id', person.id).maybeSingle() : { data: null };

  let mail;
  if (person && account) {
    await admin.from('partner_members').upsert({ partner_id: advisor.id, person_id: person.id, role: 'owner' }, { onConflict: 'partner_id,person_id' });
    mail = await sendMemberWelcome({ to: cleanEmail, name: person.full_name, partner: { name: advisor.name, logo_url: school.logo_url }, role: 'owner', code });
  } else {
    const token = newPartnerToken();
    const expires = new Date(Date.now() + PARTNER_INVITATION_TTL_DAYS * 86_400_000).toISOString();
    await admin.from('partner_invitations').insert({ partner_id: advisor.id, email: cleanEmail, role: 'owner', token, invited_by: personId, expires_at: expires });
    mail = await sendMemberInvitation({ to: cleanEmail, partner: { name: school.name, logo_url: school.logo_url }, role: 'owner', token });
  }
  return Response.json({ advisor: { ...advisor, codes: [{ code, active: true }] }, linked: !!(person && account), emailSent: mail.sent });
}

export async function DELETE(request) {
  const c = await schoolOwnerContext();
  if (c.error) return c.error;
  const { admin, school } = c;
  const { advisor_id } = await request.json().catch(() => ({}));
  if (!advisor_id) return Response.json({ error: 'advisor_id requerido' }, { status: 400 });
  const { data: adv } = await admin.from('partners').select('id').eq('id', advisor_id).eq('parent_partner_id', school.id).maybeSingle();
  if (!adv) return Response.json({ error: 'Asesor no encontrado en tu escuela' }, { status: 404 });
  await admin.from('partners').update({ status: 'inactivo' }).eq('id', advisor_id);
  await admin.from('partner_codes').update({ active: false }).eq('partner_id', advisor_id);
  await admin.from('partner_invitations').update({ status: 'revocada' }).eq('partner_id', advisor_id).eq('status', 'pendiente');
  return Response.json({ success: true });
}
