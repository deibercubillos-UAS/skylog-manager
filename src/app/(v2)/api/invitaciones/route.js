// Skylog V2.0 — invitaciones de tripulantes (Etapa C). Un gestor invita por correo a alguien con un rol; reinvitar
// al mismo correo cancela la invitación pendiente anterior. Si ya existe una persona con ese correo (p. ej. la que
// el gestor agregó en Tripulación sin acceso), la invitación queda ligada a ella y, al aceptar, recibe la cuenta.
// La tabla solo se escribe aquí (service role) después de validar permisos con las reglas del dominio.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { adminKeyProblem } from '@/lib/v2/adminKey';
import { loadJoinContextByOrgId, decideJoin } from '@/lib/v2/joinOrganization';
import { newInvitationToken, sendInvitationEmail, invitationLink, likeExact } from '@/lib/v2/invitationsServer';
import { canInviteRole, validateInvitation, invitationState, invitationExpiresAt } from '@skylog/domain';

async function session() {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  const { error, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (error || !personId) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  return { supabase, personId, memberships };
}

const rolesIn = (memberships, orgId) => (memberships || []).filter((m) => m.organization_id === orgId).map((m) => m.role);

export async function GET(request) {
  const s = await session();
  if (s.error) return s.error;
  const organizationId = new URL(request.url).searchParams.get('organizationId');
  if (!organizationId || !canInviteRole(rolesIn(s.memberships, organizationId), 'piloto')) {
    return Response.json({ error: 'Solo un gestor puede ver las invitaciones' }, { status: 403 });
  }
  const { data, error } = await s.supabase.from('invitations').select('id, email, name, role, status, expires_at, created_at, token').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(50);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const now = Date.now();
  return Response.json({
    invitations: (data || []).map(({ token, ...i }) => ({ ...i, state: invitationState(i, now), link: i.status === 'pendiente' ? invitationLink(token) : null })),
  });
}

export async function POST(request) {
  const s = await session();
  if (s.error) return s.error;
  const keyProblem = adminKeyProblem();
  if (keyProblem) return Response.json({ error: keyProblem, setup: true }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const { organizationId } = body;
  const check = validateInvitation(body);
  if (!organizationId || !check.ok) return Response.json({ error: check.errors.join(' ') || 'organizationId es requerido', errors: check.errors }, { status: 400 });
  const { clean } = check;
  if (!canInviteRole(rolesIn(s.memberships, organizationId), clean.role)) {
    return Response.json({ error: clean.role === 'admin' ? 'Solo un Gerente General puede invitar a otro Gerente General' : 'Solo un gestor puede invitar tripulantes' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: org } = await admin.from('organizations').select('id, company_name').eq('id', organizationId).maybeSingle();
  if (!org) return Response.json({ error: 'Organización no encontrada' }, { status: 404 });

  // ¿Ya existe esa persona? Si ya es miembro activo, no tiene sentido invitarla.
  const { data: existing } = await admin.from('people').select('id').ilike('email', likeExact(clean.email)).limit(1).maybeSingle();
  if (existing) {
    const { data: member } = await admin.from('memberships').select('id').eq('person_id', existing.id).eq('organization_id', organizationId).eq('status', 'activa').maybeSingle();
    if (member) return Response.json({ error: 'Esa persona ya es miembro de la organización.' }, { status: 409 });
  }

  // Avisos tempranos: cargo único ocupado o plan sin cupo (el servidor lo vuelve a validar al aceptar).
  if (clean.role !== 'admin') {
    const ctx = await loadJoinContextByOrgId(admin, org);
    const decision = decideJoin(ctx, clean.role);
    if (!decision.ok) return Response.json({ error: decision.message, reason: decision.reason }, { status: 409 });
  }

  await admin.from('invitations').update({ status: 'revocada' }).eq('organization_id', organizationId).ilike('email', likeExact(clean.email)).eq('status', 'pendiente');
  const token = newInvitationToken();
  const { data: inv, error } = await admin
    .from('invitations')
    .insert({ organization_id: organizationId, email: clean.email, name: clean.name, role: clean.role, person_id: existing?.id || null, invited_by: s.personId, token, expires_at: invitationExpiresAt(new Date().toISOString()) })
    .select('id, email, name, role, status, expires_at, created_at')
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data: inviter } = await admin.from('people').select('full_name').eq('id', s.personId).maybeSingle();
  const email = await sendInvitationEmail({ to: clean.email, name: clean.name, role: clean.role, organizationName: org.company_name, inviterName: inviter?.full_name, token });
  return Response.json({ invitation: { ...inv, state: 'usable', link: invitationLink(token) }, emailSent: email.sent });
}

export async function DELETE(request) {
  const s = await session();
  if (s.error) return s.error;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'id es requerido' }, { status: 400 });
  const admin = createAdminClient();
  const { data: inv } = await admin.from('invitations').select('organization_id, status').eq('id', id).maybeSingle();
  if (!inv) return Response.json({ error: 'Invitación no encontrada' }, { status: 404 });
  if (!canInviteRole(rolesIn(s.memberships, inv.organization_id), 'piloto')) return Response.json({ error: 'Solo un gestor puede cancelar invitaciones' }, { status: 403 });
  if (inv.status !== 'pendiente') return Response.json({ error: 'Solo se cancelan las invitaciones pendientes' }, { status: 409 });
  const { error } = await admin.from('invitations').update({ status: 'revocada' }).eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
