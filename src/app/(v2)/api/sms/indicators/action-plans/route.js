// Skylog V2.0 — F3/SPI. Planes de acción de un indicador — validados
// server-side contra §4 de la circular (defensa T/R/E real, sin verbos
// prohibidos como "verificar/auditar/examinar/supervisar" disfrazados de
// plan) antes de guardarse.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { validateActionPlan } from '@skylog/domain';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { indicatorId, defenseType, rootCause, triggerUnderControl, plan, officialDocument, executionDays } = body;
  if (!indicatorId || !rootCause || !triggerUnderControl || !plan) {
    return Response.json({ error: 'indicatorId, rootCause, triggerUnderControl y plan son requeridos' }, { status: 400 });
  }

  const validation = validateActionPlan({ defenseType, plan });
  if (!validation.valid) return Response.json({ error: validation.errors.join('; ') }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const { data: indicator, error: indicatorError } = await supabase
    .from('safety_indicators')
    .select('id, organization_id')
    .eq('id', indicatorId)
    .maybeSingle();
  if (indicatorError) return Response.json({ error: 'Error verificando el indicador' }, { status: 500 });
  if (!indicator) return Response.json({ error: 'Indicador no encontrado' }, { status: 404 });
  if (!isDutyManager(memberships, indicator.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede registrar planes de acción' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('safety_indicator_action_plans')
    .insert({
      indicator_id: indicatorId,
      organization_id: indicator.organization_id,
      defense_type: defenseType,
      root_cause: rootCause,
      trigger_under_control: triggerUnderControl,
      plan,
      official_document: officialDocument || null,
      execution_days: executionDays || null,
      created_by: personId,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ actionPlan: data });
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const indicatorId = searchParams.get('indicatorId');
  if (!indicatorId) return Response.json({ error: 'indicatorId es requerido' }, { status: 400 });

  const { data, error } = await supabase
    .from('safety_indicator_action_plans')
    .select('*')
    .eq('indicator_id', indicatorId)
    .order('created_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ actionPlans: data });
}
