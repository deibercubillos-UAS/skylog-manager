// Skylog V2.0 — F3/SPI. Dato mensual de un indicador (eventos). La tasa
// (eventos/ciclos×1000) se calcula server-side con monthlyRate() del dominio,
// nunca se acepta como valor del cliente (regla S2) — depende de los ciclos
// ya capturados en organization_monthly_cycles para ese mismo periodo.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { monthlyRate } from '@skylog/domain';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { indicatorId, year, month, events } = body;
  if (!indicatorId || !year || !month || events == null) {
    return Response.json({ error: 'indicatorId, year, month y events son requeridos' }, { status: 400 });
  }

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
    return Response.json({ error: 'Solo un gestor puede capturar datos mensuales' }, { status: 403 });
  }

  const { data: cyclesRow } = await supabase
    .from('organization_monthly_cycles')
    .select('cycles')
    .eq('organization_id', indicator.organization_id)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  const rate = monthlyRate(events, cyclesRow?.cycles || 0);

  const { data, error } = await supabase
    .from('safety_indicator_monthly')
    .upsert(
      { indicator_id: indicatorId, organization_id: indicator.organization_id, year, month, events, rate, created_by: personId },
      { onConflict: 'indicator_id,year,month' }
    )
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ monthly: data, cyclesUsed: cyclesRow?.cycles || 0 });
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
    .from('safety_indicator_monthly')
    .select('*')
    .eq('indicator_id', indicatorId)
    .order('year')
    .order('month');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ monthly: data });
}
