// Skylog V2.0 — SMS comités: integrantes de un comité (SRB/SAG). Modelo del manual WAS §11.12.7
// (40a-sms-comites-srb-sag.md). GG y GS administran (perm V7/V8 = edit); el Jefe de Pilotos y los
// integrantes ven. Agregar por correo: si la persona ya es miembro de la organización, solo se crea
// la pertenencia al comité (su rol NO cambia); si no, se le invita como `comite` para que cree su
// cuenta y entre solo a su sección (no cuenta como piloto). La tabla la escribe el servidor.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { getAuthUser } from '@/lib/v2/authUser';
import { adminKeyProblem } from '@/lib/v2/adminKey';
import { membershipsCanEdit, membershipsCanView } from '@/lib/v2/permissions';
import { newInvitationToken, sendInvitationEmail, likeExact } from '@/lib/v2/invitationsServer';
import { invitationExpiresAt } from '@skylog/domain';
import { checkRateLimit } from '@/lib/rateLimiter';
import { dbError } from '@/lib/v2/apiErrors';

const COMMITTEES = new Set(['srb', 'sag']);
const PERM = { srb: 'V7', sag: 'V8' };
const ROLES_IN_COMMITTEE = new Set(['presidente', 'secretario', 'coordinador', 'miembro', 'invitado']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function ctx(committee) {
  if (!COMMITTEES.has(committee)) return { error: Response.json({ error: 'Comité no válido' }, { status: 404 }) };
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return { error: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  const { error, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (error || !personId) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  return { supabase, personId, memberships, perm: PERM[committee] };
}

// ¿La sesión es integrante de ese comité en esa organización? (para que un integrante vea el roster).
async function isMember(admin, organizationId, committee, personId) {
  const { data } = await admin
    .from('sms_committee_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('committee', committee)
    .eq('person_id', personId)
    .maybeSingle();
  return !!data;
}

export async function GET(request, { params }) {
  const { committee } = await params;
  const s = await ctx(committee);
  if (s.error) return s.error;
  const organizationId = new URL(request.url).searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const admin = createAdminClient();
  const canManage = membershipsCanEdit(s.memberships, organizationId, s.perm);
  const canSee = canManage || membershipsCanView(s.memberships, organizationId, s.perm) || (await isMember(admin, organizationId, committee, s.personId));
  if (!canSee) return Response.json({ error: 'Sin acceso a este comité' }, { status: 403 });

  const { data, error } = await admin
    .from('sms_committee_members')
    .select('id, committee, role_in_committee, created_at, person:person_id(id, full_name, email)')
    .eq('organization_id', organizationId)
    .eq('committee', committee)
    .order('created_at');
  if (error) return dbError(error, 'integrantes del comité');
  return Response.json({ members: data || [], canManage });
}

export async function POST(request, { params }) {
  const { committee } = await params;
  const s = await ctx(committee);
  if (s.error) return s.error;
  const keyProblem = adminKeyProblem();
  if (keyProblem) return Response.json({ error: keyProblem, setup: true }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const organizationId = body.organizationId;
  const email = String(body.email || '').trim().toLowerCase();
  const name = String(body.name || '').trim() || null;
  const roleInCommittee = ROLES_IN_COMMITTEE.has(body.roleInCommittee) ? body.roleInCommittee : 'miembro';
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });
  if (!EMAIL_RE.test(email)) return Response.json({ error: 'Escribe un correo válido.' }, { status: 400 });
  if (!membershipsCanEdit(s.memberships, organizationId, s.perm)) {
    return Response.json({ error: 'Solo el Gerente General o el Gerente SMS administran los comités' }, { status: 403 });
  }
  if (!(await checkRateLimit(`comite:${s.personId}`, { limit: 15, windowMs: 60_000 })).allowed) {
    return Response.json({ error: 'Demasiadas operaciones seguidas. Espera un minuto.' }, { status: 429 });
  }

  const admin = createAdminClient();
  const { data: org } = await admin.from('organizations').select('id, company_name').eq('id', organizationId).maybeSingle();
  if (!org) return Response.json({ error: 'Organización no encontrada' }, { status: 404 });

  // ¿La persona existe y ya es miembro ACTIVO de la organización? Entonces solo se agrega la pertenencia
  // al comité (su rol operativo no cambia: un piloto sigue contando como piloto).
  const { data: person } = await admin.from('people').select('id, full_name').ilike('email', likeExact(email)).limit(1).maybeSingle();
  if (person) {
    const { data: member } = await admin.from('memberships').select('id').eq('person_id', person.id).eq('organization_id', organizationId).eq('status', 'activa').maybeSingle();
    if (member) {
      const { data: row, error } = await admin
        .from('sms_committee_members')
        .insert({ organization_id: organizationId, committee, person_id: person.id, role_in_committee: roleInCommittee, added_by: s.personId })
        .select('id, committee, role_in_committee, created_at, person:person_id(id, full_name, email)')
        .single();
      if (error) {
        if (error.code === '23505') return Response.json({ error: 'Esa persona ya es integrante de este comité.' }, { status: 409 });
        return dbError(error, 'integrantes del comité');
      }
      return Response.json({ member: row, added: true });
    }
  }

  // Persona externa (o sin membresía): se le invita como `comite` para que cree su cuenta y entre solo a
  // su sección. La fila en sms_committee_members se crea al aceptar (ver invitaciones/[token]/route.js).
  await admin.from('invitations').update({ status: 'revocada' }).eq('organization_id', organizationId).ilike('email', likeExact(email)).eq('status', 'pendiente');
  const token = newInvitationToken();
  const { data: inv, error } = await admin
    .from('invitations')
    .insert({ organization_id: organizationId, email, name, role: 'comite', committee, person_id: person?.id || null, invited_by: s.personId, token, expires_at: invitationExpiresAt(new Date().toISOString()) })
    .select('id, email, role, committee, status, expires_at')
    .single();
  if (error) return dbError(error, 'invitación de comité');

  const { data: inviter } = await admin.from('people').select('full_name').eq('id', s.personId).maybeSingle();
  const mail = await sendInvitationEmail({ to: email, name, role: 'comite', organizationName: org.company_name, inviterName: inviter?.full_name, token });
  return Response.json({ invitation: inv, invited: true, emailSent: mail.sent });
}

export async function DELETE(request, { params }) {
  const { committee } = await params;
  const s = await ctx(committee);
  if (s.error) return s.error;
  const url = new URL(request.url);
  const organizationId = url.searchParams.get('organizationId');
  const memberId = url.searchParams.get('memberId');
  if (!organizationId || !memberId) return Response.json({ error: 'organizationId y memberId son requeridos' }, { status: 400 });
  if (!membershipsCanEdit(s.memberships, organizationId, s.perm)) {
    return Response.json({ error: 'Solo el Gerente General o el Gerente SMS administran los comités' }, { status: 403 });
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from('sms_committee_members')
    .delete()
    .eq('id', memberId)
    .eq('organization_id', organizationId)
    .eq('committee', committee);
  if (error) return dbError(error, 'integrantes del comité');
  return Response.json({ ok: true });
}
