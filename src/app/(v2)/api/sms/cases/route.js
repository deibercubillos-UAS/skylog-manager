// Skylog V2.0 — F3. Casos SMS — el análisis, separado del reporte
// (docs/skylog-v2/31-esquema-datos.md §4 · 40-sms.md §5.7). "Un caso sin
// analista asignado es un caso sin dueño" — assigned_to se exige al abrir.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { canCloseCase } from '@skylog/domain';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { reportId } = body;
  if (!reportId) return Response.json({ error: 'reportId es requerido' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const { data: report, error: reportError } = await supabase
    .from('sms_reports')
    .select('id, organization_id, route')
    .eq('id', reportId)
    .maybeSingle();
  if (reportError) return Response.json({ error: 'Error verificando el reporte' }, { status: 500 });
  if (!report) return Response.json({ error: 'Reporte no encontrado' }, { status: 404 });
  if (report.route === 'rac114') {
    return Response.json({ error: 'Un reporte rac114 no abre caso SMS — sigue el procedimiento RAC 114' }, { status: 400 });
  }

  const membership = (memberships || []).find((m) => m.organization_id === report.organization_id);
  if (!membership || membership.role !== 'gerente_sms') {
    return Response.json({ error: 'Solo el Gerente SMS designado abre y asume el caso' }, { status: 403 });
  }

  const { data: caseRow, error } = await supabase
    .from('sms_cases')
    .insert({ report_id: reportId, organization_id: report.organization_id, assigned_to: personId })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return Response.json({ error: 'Ya existe un caso para este reporte' }, { status: 409 });
    return Response.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('sms_case_events').insert({
    case_id: caseRow.id,
    organization_id: report.organization_id,
    event_type: 'caso_abierto',
    payload: { assigned_to: personId },
    created_by: personId,
  });

  return Response.json({ case: caseRow });
}

export async function PATCH(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { caseId, status, confirmPendingActions } = body;
  if (!caseId || !['en_analisis', 'cerrado'].includes(status)) {
    return Response.json({ error: 'caseId y status (en_analisis/cerrado) son requeridos' }, { status: 400 });
  }

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const { data: caseRow, error: caseError } = await supabase
    .from('sms_cases')
    .select('*')
    .eq('id', caseId)
    .maybeSingle();
  if (caseError) return Response.json({ error: 'Error verificando el caso' }, { status: 500 });
  if (!caseRow) return Response.json({ error: 'Caso no encontrado' }, { status: 404 });

  const membership = (memberships || []).find((m) => m.organization_id === caseRow.organization_id);
  if (!membership || membership.role !== 'gerente_sms') {
    return Response.json({ error: 'Solo el Gerente SMS asignado gestiona este caso' }, { status: 403 });
  }

  if (caseRow.status === 'cerrado') return Response.json({ error: 'El caso ya está cerrado.' }, { status: 409 });

  const patch = { status };
  let pendingActions = 0;
  if (status === 'cerrado') {
    // Reglas de cierre (smsTracking.canCloseCase): resumen de la investigación y, si es MOR, radicado.
    const [{ data: report }, { data: actions }] = await Promise.all([
      supabase.from('sms_reports').select('route, filed_at').eq('id', caseRow.report_id).maybeSingle(),
      supabase.from('sms_case_actions').select('done_at').eq('case_id', caseId),
    ]);
    const check = canCloseCase({ report, investigationSummary: caseRow.investigation_summary, actions });
    if (!check.ok) return Response.json({ error: check.errors.join(' '), errors: check.errors }, { status: 409 });
    pendingActions = check.pendingActions;
    if (pendingActions > 0 && !confirmPendingActions) {
      return Response.json({ error: `Quedan ${pendingActions} acción(es) correctiva(s) pendiente(s). Confirma para cerrar el caso igualmente.`, pendingActions, needsConfirmation: true }, { status: 409 });
    }
    patch.closed_at = new Date().toISOString();
  }

  const { data, error } = await supabase.from('sms_cases').update(patch).eq('id', caseId).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  await supabase.from('sms_case_events').insert({
    case_id: caseId,
    organization_id: caseRow.organization_id,
    event_type: status === 'cerrado' ? 'caso_cerrado' : 'caso_en_analisis',
    payload: status === 'cerrado' ? { pending_actions: pendingActions } : {},
    created_by: personId,
  });

  return Response.json({ case: data });
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { data, error } = await supabase
    .from('sms_cases')
    .select('*, sms_reports(id, severity, route, description), sms_case_actions(*)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ cases: data });
}
