// Skylog V2.0 — SMS comités: actas de reunión de un comité (SRB/SAG). Modelo del manual WAS §11.12.7
// (40a-sms-comites-srb-sag.md): el acta la firman los participantes y registra, según el comité,
// decisiones (SRB) o acciones (SAG), con responsables y plazos. GG y GS administran (perm V7/V8 = edit);
// el Jefe de Pilotos y los integrantes ven las de su comité. La tabla la escribe el servidor.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { getAuthUser } from '@/lib/v2/authUser';
import { membershipsCanEdit, membershipsCanView } from '@/lib/v2/permissions';
import { logAudit } from '@/lib/v2/auditLog';
import { dbError } from '@/lib/v2/apiErrors';

const COMMITTEES = new Set(['srb', 'sag']);
const PERM = { srb: 'V7', sag: 'V8' };
const MEETING_TYPES = new Set(['ordinaria', 'extraordinaria']);
const COMMITTEE_LABEL = { srb: 'SRB', sag: 'SAG' };

async function ctx(committee) {
  if (!COMMITTEES.has(committee)) return { error: Response.json({ error: 'Comité no válido' }, { status: 404 }) };
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return { error: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  const { error, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (error || !personId) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  return { supabase, personId, memberships, perm: PERM[committee] };
}

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

// Normaliza y valida los campos del acta comunes a POST y PATCH. Devuelve { fields } o { error }.
function parseMeeting(body, { partial = false } = {}) {
  const out = {};
  const has = (k) => Object.prototype.hasOwnProperty.call(body, k);
  if (!partial || has('title')) {
    const title = String(body.title || '').trim();
    if (!title) return { error: 'El título del acta es requerido' };
    if (title.length > 200) return { error: 'El título es demasiado largo' };
    out.title = title;
  }
  if (!partial || has('meetingDate')) {
    if (!body.meetingDate) return { error: 'La fecha de la reunión es requerida' };
    out.meeting_date = body.meetingDate;
  }
  if (!partial || has('meetingType')) {
    const t = body.meetingType || 'ordinaria';
    if (!MEETING_TYPES.has(t)) return { error: 'Tipo de reunión no válido' };
    out.meeting_type = t;
  }
  if (!partial || has('agenda')) out.agenda = String(body.agenda || '').trim();
  if (!partial || has('decisions')) out.decisions = String(body.decisions || '').trim();
  if (!partial || has('commitments')) {
    if (body.commitments != null && !Array.isArray(body.commitments)) return { error: 'commitments debe ser una lista' };
    out.commitments = Array.isArray(body.commitments) ? body.commitments : [];
  }
  if (!partial || has('attendees')) {
    if (body.attendees != null && !Array.isArray(body.attendees)) return { error: 'attendees debe ser una lista' };
    out.attendees = Array.isArray(body.attendees) ? body.attendees : [];
  }
  return { fields: out };
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
    .from('sms_committee_meetings')
    .select('id, committee, meeting_date, meeting_type, title, agenda, decisions, commitments, attendees, created_at, updated_at')
    .eq('organization_id', organizationId)
    .eq('committee', committee)
    .order('meeting_date', { ascending: false });
  if (error) return dbError(error, 'actas del comité');
  return Response.json({ meetings: data || [], canManage });
}

export async function POST(request, { params }) {
  const { committee } = await params;
  const s = await ctx(committee);
  if (s.error) return s.error;
  const body = await request.json().catch(() => ({}));
  const organizationId = body.organizationId;
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });
  if (!membershipsCanEdit(s.memberships, organizationId, s.perm)) {
    return Response.json({ error: 'Solo el Gerente General o el Gerente SMS registran actas' }, { status: 403 });
  }
  const parsed = parseMeeting(body);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 });

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from('sms_committee_meetings')
    .insert({ organization_id: organizationId, committee, created_by: s.personId, ...parsed.fields })
    .select('id, committee, meeting_date, meeting_type, title, agenda, decisions, commitments, attendees, created_at, updated_at')
    .single();
  if (error) return dbError(error, 'actas del comité');
  await logAudit({ organizationId, action: 'create', module: `Comité ${COMMITTEE_LABEL[committee]}`, entityLabel: `Acta ${row.meeting_date} — ${row.title}` });
  return Response.json({ meeting: row });
}

export async function PATCH(request, { params }) {
  const { committee } = await params;
  const s = await ctx(committee);
  if (s.error) return s.error;
  const body = await request.json().catch(() => ({}));
  const organizationId = body.organizationId;
  const meetingId = body.meetingId;
  if (!organizationId || !meetingId) return Response.json({ error: 'organizationId y meetingId son requeridos' }, { status: 400 });
  if (!membershipsCanEdit(s.memberships, organizationId, s.perm)) {
    return Response.json({ error: 'Solo el Gerente General o el Gerente SMS editan actas' }, { status: 403 });
  }
  const parsed = parseMeeting(body, { partial: true });
  if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 });
  if (!Object.keys(parsed.fields).length) return Response.json({ error: 'No hay cambios' }, { status: 400 });

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from('sms_committee_meetings')
    .update({ ...parsed.fields, updated_at: new Date().toISOString() })
    .eq('id', meetingId)
    .eq('organization_id', organizationId)
    .eq('committee', committee)
    .select('id, committee, meeting_date, meeting_type, title, agenda, decisions, commitments, attendees, created_at, updated_at')
    .single();
  if (error) return dbError(error, 'actas del comité');
  if (!row) return Response.json({ error: 'Acta no encontrada' }, { status: 404 });
  await logAudit({ organizationId, action: 'update', module: `Comité ${COMMITTEE_LABEL[committee]}`, entityLabel: `Acta ${row.meeting_date} — ${row.title}` });
  return Response.json({ meeting: row });
}

export async function DELETE(request, { params }) {
  const { committee } = await params;
  const s = await ctx(committee);
  if (s.error) return s.error;
  const url = new URL(request.url);
  const organizationId = url.searchParams.get('organizationId');
  const meetingId = url.searchParams.get('meetingId');
  if (!organizationId || !meetingId) return Response.json({ error: 'organizationId y meetingId son requeridos' }, { status: 400 });
  if (!membershipsCanEdit(s.memberships, organizationId, s.perm)) {
    return Response.json({ error: 'Solo el Gerente General o el Gerente SMS eliminan actas' }, { status: 403 });
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from('sms_committee_meetings')
    .delete()
    .eq('id', meetingId)
    .eq('organization_id', organizationId)
    .eq('committee', committee);
  if (error) return dbError(error, 'actas del comité');
  await logAudit({ organizationId, action: 'delete', module: `Comité ${COMMITTEE_LABEL[committee]}`, entityLabel: `Acta ${meetingId}` });
  return Response.json({ ok: true });
}
