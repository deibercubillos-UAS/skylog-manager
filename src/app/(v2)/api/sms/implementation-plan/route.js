// Skylog V2.0 — SMS-C. Plan de implementación sobre las 4 fases OFICIALES
// de MAUT-5.0-22-017 (40-sms.md §5.9) — reemplaza, para `/sms/asistente`, el
// agregador de 5 fases inventadas de `implementation-progress/route.js`
// (ese endpoint se deja intacto, tiene su propio consumidor histórico).
// GET agrega los mismos datos reales (gobernanza, riesgo, SPI, capacitación)
// + el plan y las tareas tipo Gantt ya guardadas. POST crea/actualiza la
// fecha de inicio + horizonte del plan (12-24 meses, §7.3.5).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { computeOfficialProgress, validatePlanHorizon } from '@skylog/domain';

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, organizationIds } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!organizationIds.includes(organizationId)) return Response.json({ error: 'Sin membresía activa en esa organización' }, { status: 403 });

  const [gsoRes, policyRes, matrixRes, hazardsRes, indicatorsRes, sessionsRes, gapRes, msmsRes, planRes, tasksRes] = await Promise.all([
    supabase.from('designations').select('id').eq('organization_id', organizationId).eq('role_type', 'gerente_sms').is('ended_at', null).maybeSingle(),
    supabase.from('sms_policies').select('id').eq('organization_id', organizationId).not('signed_at', 'is', null).limit(1).maybeSingle(),
    supabase.from('risk_matrices').select('tolerability').eq('organization_id', organizationId).maybeSingle(),
    supabase.from('hazards').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('safety_indicator_monthly').select('indicator_id').eq('organization_id', organizationId),
    supabase.from('sms_training_attendance').select('session_id').eq('organization_id', organizationId),
    supabase.from('sms_gap_assessments').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('manuales').select('id').eq('organization_id', organizationId).eq('title', 'MSMS — Manual del Sistema de Gestión de Seguridad Operacional').maybeSingle(),
    supabase.from('sms_implementation_plan').select('*').eq('organization_id', organizationId).maybeSingle(),
    supabase.from('sms_implementation_tasks').select('*, responsible:responsible_person_id(full_name)').eq('organization_id', organizationId),
  ]);

  const errors = [gsoRes, policyRes, matrixRes, hazardsRes, indicatorsRes, sessionsRes, gapRes, msmsRes, planRes, tasksRes].map((r) => r.error).filter(Boolean);
  if (errors.length) return Response.json({ error: errors[0].message }, { status: 500 });

  const monthsByIndicator = {};
  for (const row of indicatorsRes.data || []) {
    monthsByIndicator[row.indicator_id] = (monthsByIndicator[row.indicator_id] || 0) + 1;
  }
  const indicatorsWithThreeMonthsData = Object.values(monthsByIndicator).filter((n) => n >= 3).length;

  const tasks = tasksRes.data || [];
  const manualDone = tasks.filter((t) => t.element_key && t.manual_done).map((t) => t.element_key);

  const progress = computeOfficialProgress(
    {
      policySigned: !!policyRes.data,
      gsoDesignated: !!gsoRes.data,
      hazardsRegistered: (hazardsRes.count || 0) > 0,
      riskMatrixConfigured: !!matrixRes.data && Array.isArray(matrixRes.data.tolerability) && matrixRes.data.tolerability.length > 0,
      spiWithHistory: indicatorsWithThreeMonthsData >= 3,
      // GAP ya existe (SMS-D) — al menos una autoevaluación realizada.
      // MSMS ya existe (SMS-I) — publicado al menos una vez en Manuales.
      gapAssessmentCompleted: (gapRes.count || 0) > 0,
      msmsPublished: !!msmsRes.data,
      trainingWithAttendance: new Set((sessionsRes.data || []).map((r) => r.session_id)).size > 0,
    },
    manualDone
  );

  return Response.json({ progress, plan: planRes.data || null, tasks });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, planStartDate, horizonMonths } = body;
  if (!organizationId || !planStartDate || !validatePlanHorizon(horizonMonths)) {
    return Response.json({ error: 'organizationId, planStartDate y horizonMonths (12-24) son requeridos' }, { status: 400 });
  }

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede definir el plan de implementación' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('sms_implementation_plan')
    .upsert({ organization_id: organizationId, plan_start_date: planStartDate, horizon_months: horizonMonths, created_by: personId, updated_at: new Date().toISOString() }, { onConflict: 'organization_id' })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ plan: data });
}
