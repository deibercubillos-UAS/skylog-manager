// Skylog V2.0 — administración de socios (escuelas y asesores) por el superadmin (Etapa E1). Equivalente del tab
// «Socios» del Master de la versión actual, sobre las tablas de V2. Solo el superadmin; toda escritura va con la llave
// de servicio después de comprobar el rol.
import { requireSuperadmin } from '@/lib/v2/platformAdmin';
import { adminKeyProblem } from '@/lib/v2/adminKey';
import { generateUniqueCode, newPartnerToken, setOwnerEnterprise, sendMemberWelcome, sendMemberInvitation } from '@/lib/v2/partnersServer';
import { likeExact } from '@/lib/v2/invitationsServer';
import { normalizeCode, validatePartnerInput, partnerInvitationState, PARTNER_INVITATION_TTL_DAYS } from '@skylog/domain';

export const dynamic = 'force-dynamic';

const bad = (message, status = 400) => Response.json({ error: message }, { status });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function GET() {
  const g = await requireSuperadmin();
  if (g.error) return g.error;
  const { admin } = g;
  const [partners, codes, members, invites, commissions] = await Promise.all([
    admin.from('partners').select('*').order('created_at', { ascending: false }),
    admin.from('partner_codes').select('id, partner_id, code, active'),
    admin.from('partner_members').select('id, partner_id, role, person_id, person:people(full_name, email)'),
    admin.from('partner_invitations').select('id, partner_id, email, role, status, created_at, expires_at').order('created_at', { ascending: false }),
    admin.from('referrals').select('partner_id, status'),
  ]);
  const failed = [partners, codes, members, invites, commissions].find((r) => r.error);
  if (failed) return bad(failed.error.message, 500);

  const by = (rows, key) => (rows || []).reduce((acc, r) => ((acc[r[key]] ||= []).push(r), acc), {});
  const codesBy = by(codes.data, 'partner_id');
  const membersBy = by(members.data, 'partner_id');
  const invitesBy = by(invites.data, 'partner_id');
  const clientsBy = by((commissions.data || []).filter((r) => r.status === 'activa'), 'partner_id');
  const now = Date.now();

  return Response.json({
    partners: (partners.data || []).map((p) => ({
      ...p,
      codes: codesBy[p.id] || [],
      members: (membersBy[p.id] || []).map((m) => ({ id: m.id, role: m.role, person_id: m.person_id, name: m.person?.full_name || null, email: m.person?.email || null })),
      invitations: (invitesBy[p.id] || []).map((i) => ({ ...i, state: partnerInvitationState(i, now) })),
      active_clients: (clientsBy[p.id] || []).length,
    })),
  });
}

export async function POST(request) {
  const g = await requireSuperadmin();
  if (g.error) return g.error;
  const { admin, personId } = g;
  const keyProblem = adminKeyProblem();
  if (keyProblem) return Response.json({ error: keyProblem, setup: true }, { status: 503 });
  const body = await request.json().catch(() => ({}));

  if (body.action === 'add_code' || body.action === 'update_code') {
    if (body.action === 'add_code') {
      if (!body.partner_id) return bad('partner_id requerido');
      const { data: partner } = await admin.from('partners').select('name').eq('id', body.partner_id).maybeSingle();
      if (!partner) return bad('Socio no encontrado', 404);
      const code = normalizeCode(body.code) || (await generateUniqueCode(admin, partner.name));
      const { data, error } = await admin.from('partner_codes').insert({ partner_id: body.partner_id, code }).select().single();
      if (error) return error.code === '23505' ? bad(`El código "${code}" ya está en uso.`, 409) : bad(error.message, 500);
      return Response.json(data);
    }
    if (!body.code_id) return bad('code_id requerido');
    const patch = {};
    if (body.code !== undefined) {
      const code = normalizeCode(body.code);
      if (!code) return bad('Código inválido');
      patch.code = code;
    }
    if (body.active !== undefined) patch.active = !!body.active;
    if (!Object.keys(patch).length) return bad('Sin campos para actualizar');
    const { data, error } = await admin.from('partner_codes').update(patch).eq('id', body.code_id).select().single();
    if (error) return error.code === '23505' ? bad(`El código "${patch.code}" ya está en uso.`, 409) : bad(error.message, 500);
    return Response.json(data);
  }

  if (body.action === 'add_member') {
    const email = String(body.email || '').trim().toLowerCase();
    const role = body.role === 'owner' ? 'owner' : 'asesor';
    if (!body.partner_id || !EMAIL_RE.test(email)) return bad('partner_id y un correo válido son requeridos');
    const { data: partner } = await admin.from('partners').select('id, name, type, logo_url').eq('id', body.partner_id).maybeSingle();
    if (!partner) return bad('Socio no encontrado', 404);
    const { data: firstCode } = await admin.from('partner_codes').select('code').eq('partner_id', partner.id).eq('active', true).limit(1).maybeSingle();

    // ¿Ya tiene cuenta? (persona con cuenta, no solo una persona creada por un gestor)
    const { data: person } = await admin.from('people').select('id, full_name').ilike('email', likeExact(email)).limit(1).maybeSingle();
    const { data: account } = person ? await admin.from('accounts').select('id').eq('person_id', person.id).maybeSingle() : { data: null };

    if (person && account) {
      const { error } = await admin.from('partner_members').upsert({ partner_id: partner.id, person_id: person.id, role }, { onConflict: 'partner_id,person_id' });
      if (error) return bad(error.message, 500);
      if (role === 'owner' && partner.type === 'escuela') await setOwnerEnterprise(admin, person.id, partner.id, true);
      const mail = await sendMemberWelcome({ to: email, name: person.full_name, partner, role, code: firstCode?.code });
      return Response.json({ success: true, linked: true, emailSent: mail.sent });
    }

    await admin.from('partner_invitations').update({ status: 'revocada' }).eq('partner_id', partner.id).ilike('email', likeExact(email)).eq('status', 'pendiente');
    const token = newPartnerToken();
    const expires = new Date(Date.now() + PARTNER_INVITATION_TTL_DAYS * 86_400_000).toISOString();
    const { error } = await admin.from('partner_invitations').insert({ partner_id: partner.id, email, role, token, invited_by: personId, expires_at: expires });
    if (error) return bad(error.message, 500);
    const mail = await sendMemberInvitation({ to: email, partner, role, token });
    return Response.json({ success: true, linked: false, invited: true, emailSent: mail.sent });
  }

  if (body.action === 'remove_member') {
    if (!body.member_id) return bad('member_id requerido');
    const { data: member } = await admin.from('partner_members').select('id, role, person_id, partner_id').eq('id', body.member_id).maybeSingle();
    if (!member) return bad('Miembro no encontrado', 404);
    const { error } = await admin.from('partner_members').delete().eq('id', member.id);
    if (error) return bad(error.message, 500);
    // Si ya no es dueño de ninguna escuela, pierde el Enterprise que traía por serlo.
    if (member.role === 'owner') {
      const { data: still } = await admin.from('partner_members').select('partner_id, partner:partners(type, status)').eq('person_id', member.person_id).eq('role', 'owner');
      if (!(still || []).some((s) => s.partner?.type === 'escuela' && s.partner?.status === 'activo')) await setOwnerEnterprise(admin, member.person_id, member.partner_id, false);
    }
    return Response.json({ success: true });
  }

  if (body.action === 'revoke_invitation') {
    if (!body.invitation_id) return bad('invitation_id requerido');
    const { error } = await admin.from('partner_invitations').update({ status: 'revocada' }).eq('id', body.invitation_id).eq('status', 'pendiente');
    if (error) return bad(error.message, 500);
    return Response.json({ success: true });
  }

  // Crear socio (con su primer código; personalizable)
  const check = validatePartnerInput(body);
  if (!check.ok) return bad(check.errors.join(' '));
  const { clean } = check;
  if (body.parent_partner_id) {
    const { data: parent } = await admin.from('partners').select('type').eq('id', body.parent_partner_id).maybeSingle();
    if (!parent || parent.type !== 'escuela') return bad('Un asesor solo puede colgar de una escuela.');
    if (clean.type !== 'asesor') return bad('Solo un asesor puede depender de una escuela.');
  }
  const { data: partner, error } = await admin.from('partners').insert({ ...clean, parent_partner_id: body.parent_partner_id || null, created_by: personId }).select().single();
  if (error) return bad(error.message, 500);
  const code = normalizeCode(body.code) || (await generateUniqueCode(admin, partner.name));
  const { error: codeError } = await admin.from('partner_codes').insert({ partner_id: partner.id, code });
  if (codeError) {
    // El socio ya existe: no se revierte por un choque de código personalizado; se agrega otro desde «Agregar código».
    return Response.json({ ...partner, codes: [], code_error: `El código "${code}" ya está en uso — agrega uno distinto.` });
  }
  return Response.json({ ...partner, codes: [{ code }] });
}

export async function PATCH(request) {
  const g = await requireSuperadmin();
  if (g.error) return g.error;
  const { admin } = g;
  const { id, updateData } = await request.json().catch(() => ({}));
  if (!id || !updateData || typeof updateData !== 'object') return bad('id y updateData requeridos');

  const ALLOWED = ['name', 'status', 'commission_pct', 'free_seats_limit', 'free_days', 'parent_partner_id'];
  const picked = Object.fromEntries(Object.entries(updateData).filter(([k]) => ALLOWED.includes(k)));
  if (!Object.keys(picked).length) return bad('Sin campos válidos');
  const check = validatePartnerInput(picked, { partial: true });
  if (!check.ok) return bad(check.errors.join(' '));
  if (check.clean.parent_partner_id === id) return bad('Un socio no puede depender de sí mismo.');

  const { data, error } = await admin.from('partners').update(check.clean).eq('id', id).select().single();
  if (error) return bad(error.message, 500);

  // El dueño de una escuela activa tiene Enterprise; al desactivarla lo pierde.
  if ('status' in check.clean && data.type === 'escuela') {
    const { data: owners } = await admin.from('partner_members').select('person_id').eq('partner_id', id).eq('role', 'owner');
    for (const o of owners || []) await setOwnerEnterprise(admin, o.person_id, id, data.status === 'activo');
  }
  return Response.json(data);
}

export async function DELETE(request) {
  const g = await requireSuperadmin();
  if (g.error) return g.error;
  const { admin } = g;
  const { id } = await request.json().catch(() => ({}));
  if (!id) return bad('id requerido');
  const { data, error } = await admin.from('partners').update({ status: 'inactivo' }).eq('id', id).select('type').single();
  if (error) return bad(error.message, 500);
  if (data.type === 'escuela') {
    const { data: owners } = await admin.from('partner_members').select('person_id').eq('partner_id', id).eq('role', 'owner');
    for (const o of owners || []) await setOwnerEnterprise(admin, o.person_id, id, false);
  }
  return Response.json({ success: true });
}
