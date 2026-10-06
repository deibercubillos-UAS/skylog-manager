// Skylog V2.0 — Seguimiento de un caso VOR/MOR. El detalle completo (análisis, causas, acciones, línea de
// tiempo, evidencias) lo ve SOLO el Gerente SMS (decisión del usuario, 2026-10-06): la RLS de sms_cases,
// sms_case_actions y sms_case_events ya lo impone con v2_is_sms_analyst — la API repite el chequeo para dar
// un mensaje claro en vez de un "no encontrado" mudo.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { bogotaDay } from '@/lib/v2/dispatchContext';
import { computeReportDeadline, buildCaseTimeline } from '@skylog/domain';

const CASE_SELECT = '*, analyst:assigned_to(full_name), sms_case_actions(*, responsible:responsible_id(full_name)), sms_case_events(id, event_type, payload, created_at, actor:created_by(full_name))';
const REPORT_SELECT =
  '*, reporter:reported_by(full_name), analyzer:analyzed_by(full_name), aircraft:aircraft_id(serial_number, model:model_id(brand, model)), flight:flight_id(takeoff_at, landing_at), sms_report_attachments(id, file_name, content_type, size_bytes, created_at)';

const NOT_ANALYST = 'Solo el Gerente SMS puede ver el detalle de un caso.';

export async function GET(request, { params }) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const { data: caseRow, error } = await supabase.from('sms_cases').select(CASE_SELECT).eq('id', id).maybeSingle();
  if (error) return Response.json({ error: 'Error consultando el caso' }, { status: 500 });
  if (!caseRow) return Response.json({ error: `Caso no encontrado. ${NOT_ANALYST}` }, { status: 404 });

  const { data: report, error: reportError } = await supabase.from('sms_reports').select(REPORT_SELECT).eq('id', caseRow.report_id).maybeSingle();
  if (reportError || !report) return Response.json({ error: 'Error consultando el reporte del caso' }, { status: 500 });

  const { data: hazards } = await supabase.from('hazards').select('id, description').eq('organization_id', caseRow.organization_id).order('description');
  const { data: memberRows } = await supabase.from('memberships').select('person_id, role, people(full_name)').eq('organization_id', caseRow.organization_id).eq('status', 'activa');
  const members = (memberRows || []).map((m) => ({ personId: m.person_id, fullName: m.people?.full_name || m.person_id, role: m.role }));

  const { sms_case_actions: actions, sms_case_events: events, ...caseFields } = caseRow;
  const { sms_report_attachments: attachments, ...reportFields } = report;
  const events2 = (events || []).map((e) => ({ ...e, actor: e.actor?.full_name || null }));
  const timeline = buildCaseTimeline(reportFields, events2, { reporter: reportFields.reporter?.full_name, analyzer: reportFields.analyzer?.full_name });

  return Response.json({
    case: caseFields,
    report: reportFields,
    attachments: attachments || [],
    actions: (actions || []).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    timeline,
    deadline: computeReportDeadline(reportFields, bogotaDay(new Date())),
    hazards: hazards || [],
    members,
  });
}

// Edita el análisis: resumen de la investigación, factores contribuyentes y peligro asociado.
export async function PATCH(request, { params }) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { investigationSummary, contributingFactors, hazardId } = body;

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const { data: caseRow, error } = await supabase.from('sms_cases').select('id, organization_id, status, investigation_summary, contributing_factors, hazard_id').eq('id', id).maybeSingle();
  if (error) return Response.json({ error: 'Error consultando el caso' }, { status: 500 });
  if (!caseRow) return Response.json({ error: `Caso no encontrado. ${NOT_ANALYST}` }, { status: 404 });

  const membership = (memberships || []).find((m) => m.organization_id === caseRow.organization_id);
  if (!membership || !['gerente_sms', 'superadmin'].includes(membership.role)) return Response.json({ error: NOT_ANALYST }, { status: 403 });
  if (caseRow.status === 'cerrado') return Response.json({ error: 'El caso está cerrado y no se puede modificar.' }, { status: 409 });

  const patch = {};
  const changed = [];
  const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) || null : null);
  if (investigationSummary !== undefined) {
    patch.investigation_summary = clean(investigationSummary, 5000);
    if (patch.investigation_summary !== (caseRow.investigation_summary || null)) changed.push('resumen de la investigación');
  }
  if (contributingFactors !== undefined) {
    patch.contributing_factors = clean(contributingFactors, 3000);
    if (patch.contributing_factors !== (caseRow.contributing_factors || null)) changed.push('factores contribuyentes');
  }
  if (hazardId !== undefined) {
    if (hazardId) {
      const { data: hazard } = await supabase.from('hazards').select('id').eq('id', hazardId).eq('organization_id', caseRow.organization_id).maybeSingle();
      if (!hazard) return Response.json({ error: 'El peligro no existe en esta organización' }, { status: 400 });
    }
    patch.hazard_id = hazardId || null;
    if (patch.hazard_id !== (caseRow.hazard_id || null)) changed.push('peligro asociado');
  }
  if (Object.keys(patch).length === 0) return Response.json({ error: 'Ningún campo para actualizar' }, { status: 400 });

  const { data, error: updateError } = await supabase.from('sms_cases').update(patch).eq('id', id).select().single();
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

  // Solo queda en la línea de tiempo si algo cambió de verdad (guardar sin tocar nada no es un evento).
  if (changed.length > 0) {
    await supabase.from('sms_case_events').insert({ case_id: id, organization_id: caseRow.organization_id, event_type: 'analisis_actualizado', payload: { fields: changed }, created_by: personId });
  }
  return Response.json({ case: data, changed });
}
