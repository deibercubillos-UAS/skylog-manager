// Skylog V2.0 — Despacho (RAC 100 §100.535(23)). GET: las misiones que el piloto puede despachar
// hoy o ya tiene en curso, más el historial reciente de despachos. POST: despachar.
//
// La constancia (`dispatches` + `dispatch_checklist_items`) la escribe SOLO esta ruta, con service
// role y a través de la RPC atómica `v2_dispatch_create`, DESPUÉS de re-evaluar todo en el
// servidor: gates, listas de chequeo (el texto de cada paso sale de la base, no del navegador) y
// riesgos. Ningún usuario tiene política de escritura sobre esas tablas.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { loadDispatchContext, bogotaDay } from '@/lib/v2/dispatchContext';
import { adminKeyProblem } from '@/lib/v2/adminKey';
import { buildChecklistItems, evaluateDispatchRisk } from '@skylog/domain';

const one = (x) => (Array.isArray(x) ? x[0] : x) || null;

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const organizationId = new URL(request.url).searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ missions: [], dispatches: [] });
  if (!(memberships || []).some((m) => m.organization_id === organizationId)) return Response.json({ error: 'Sin membresía activa en esa organización' }, { status: 403 });

  // Bogotá es UTC−5 todo el año (sin horario de verano): el día de hoy va de 00:00−05 a 00:00−05 del siguiente.
  const today = bogotaDay(new Date());
  const dayStart = `${today}T00:00:00-05:00`;
  const dayEnd = new Date(Date.parse(dayStart) + 86_400_000).toISOString();

  const missionSelect = '*, aircraft:aircraft_id(serial_number, operational_status, model:model_id(brand, model)), dispatch:dispatches(id, status, dispatched_at)';
  const [{ data: todays, error: todaysError }, { data: open, error: openError }, { data: history, error: historyError }] = await Promise.all([
    supabase.from('missions').select(missionSelect).eq('organization_id', organizationId).eq('pic_person_id', personId).eq('status', 'programada').gte('scheduled_at', dayStart).lt('scheduled_at', dayEnd).order('scheduled_at'),
    // En curso: despachadas, sin importar la fecha (un vuelo despachado ayer y sin cerrar sigue pendiente).
    supabase.from('missions').select(missionSelect).eq('organization_id', organizationId).eq('pic_person_id', personId).eq('status', 'despachada').order('scheduled_at'),
    supabase
      .from('dispatches')
      .select('id, status, dispatched_at, closed_at, safety_report, safety_report_type, risk_initial_zone, gates, mission:mission_id(name, zone), pilot:pilot_person_id(full_name), aircraft:aircraft_id(serial_number, model:model_id(brand, model)), items:dispatch_checklist_items(value)')
      .eq('organization_id', organizationId)
      .order('dispatched_at', { ascending: false })
      .limit(30),
  ]);
  if (todaysError || openError || historyError) return Response.json({ error: 'Error consultando el despacho' }, { status: 500 });

  const normalize = (m) => ({ ...m, dispatch: one(m.dispatch) });
  const dispatches = (history || []).map(({ items, ...d }) => ({ ...d, items_total: (items || []).length, items_no: (items || []).filter((i) => i.value === 'no').length }));
  return Response.json({ today, missions: (todays || []).map(normalize), inProgress: (open || []).map(normalize), dispatches });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { missionId, answers, risk } = body;
  if (!missionId) return Response.json({ error: 'missionId es requerido' }, { status: 400 });

  // La constancia se escribe con service role: sin una llave real el despacho no puede guardarse.
  // Se avisa ANTES de pedirle al piloto que llene todo, con la causa real y no un 500 genérico.
  const keyProblem = adminKeyProblem();
  if (keyProblem) return Response.json({ error: keyProblem, setup: true }, { status: 503 });

  const ctx = await loadDispatchContext(supabase, { userId: user.id, missionId });
  if (!ctx.ok) return Response.json({ error: ctx.error }, { status: ctx.status });

  if (!ctx.canDispatch) {
    return Response.json({ error: 'Hay verificaciones que bloquean el despacho', gates: ctx.gates, blockedBy: ctx.blockedBy }, { status: 409 });
  }

  const checklist = buildChecklistItems(ctx.checklists, answers);
  if (!checklist.complete) {
    return Response.json({ error: `Faltan ${checklist.missing} paso(s) de las listas de chequeo por responder` }, { status: 400 });
  }

  // Sin matriz configurada la evaluación se omite (es un aviso, no un bloqueo) — nunca se inventa una zona.
  let riskResult = null;
  if (ctx.riskMatrix) {
    riskResult = evaluateDispatchRisk({
      tolerability: ctx.riskMatrix.tolerability,
      probabilityCode: risk?.probabilityCode,
      severityCode: risk?.severityCode,
      mitigation: risk?.mitigation,
      residualProbabilityCode: risk?.residualProbabilityCode,
      residualSeverityCode: risk?.residualSeverityCode,
    });
    if (!riskResult.ok) return Response.json({ error: riskResult.errors.join(' '), riskErrors: riskResult.errors }, { status: 400 });
  }

  const payload = {
    organization_id: ctx.organizationId,
    mission_id: missionId,
    pilot_person_id: ctx.personId,
    gates: ctx.gates,
    risk_evaluated: !!riskResult,
    risk_probability_code: riskResult ? risk.probabilityCode : null,
    risk_severity_code: riskResult ? risk.severityCode : null,
    risk_initial_zone: riskResult?.initialZone ?? null,
    risk_mitigation: riskResult?.storedMitigation ?? null,
    risk_mitigation_voluntary: riskResult?.voluntaryMitigation ?? false,
    risk_residual_probability_code: riskResult?.needsMitigation ? risk.residualProbabilityCode : null,
    risk_residual_severity_code: riskResult?.needsMitigation ? risk.residualSeverityCode : null,
    risk_residual_zone: riskResult?.residualZone ?? null,
    items: checklist.items,
  };

  const { data: dispatchId, error } = await createAdminClient().rpc('v2_dispatch_create', { p: payload });
  if (error) {
    // La RPC repite las reglas críticas con mensajes en español (estado de la misión, PIC, período abierto).
    console.error('[despacho] v2_dispatch_create falló:', error.message);
    const known = /ya no se puede despachar|Solo el PIC|período de|no pertenece/.test(error.message);
    return Response.json({ error: known ? error.message : 'No se pudo registrar el despacho' }, { status: known ? 409 : 500 });
  }

  return Response.json({ dispatchId, warnings: ctx.gates.filter((g) => g.status === 'warn'), noCount: checklist.noCount });
}
