// Skylog V2.0 — F4a. Análisis de riesgos MAUT-5.0-12-055 por solicitud de
// autorización — formato oficial fijo (regla C2, 01-reglas.md §5b), distinto
// de la matriz de riesgo del SMS interno (regla C3). La conformidad de cada
// peligro y el permiso de firma se recalculan server-side con
// evaluateRiskAnalysis() (packages/domain) — nunca se confía en `canSign` del
// cliente (regla S2, mismo criterio que total_hours en la certificación F5).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { evaluateRiskAnalysis } from '@skylog/domain';

async function loadAuthorizationOrg(supabase, authorizationId) {
  const { data, error } = await supabase
    .from('authorization_requests')
    .select('id, organization_id')
    .eq('id', authorizationId)
    .maybeSingle();
  return { data, error };
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { authorizationId, hazards } = body;
  if (!authorizationId || !Array.isArray(hazards)) {
    return Response.json({ error: 'authorizationId y hazards (array) son requeridos' }, { status: 400 });
  }

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });

  const { data: authRequest, error: authError } = await loadAuthorizationOrg(supabase, authorizationId);
  if (authError) return Response.json({ error: 'Error verificando la solicitud' }, { status: 500 });
  if (!authRequest) return Response.json({ error: 'Solicitud de autorización no encontrada' }, { status: 404 });
  if (!isDutyManager(memberships, authRequest.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede diligenciar el análisis de riesgos' }, { status: 403 });
  }

  const evaluation = evaluateRiskAnalysis(hazards);

  const { data, error } = await supabase
    .from('risk_analyses')
    .upsert(
      { authorization_id: authorizationId, hazards, can_sign: evaluation.canSign },
      { onConflict: 'authorization_id' }
    )
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ riskAnalysis: data, evaluation });
}

/** Firma el análisis — solo si evaluateRiskAnalysis() confirma canSign sobre los
 * hazards ya guardados (nunca sobre lo que mande el cliente en esta llamada). */
export async function PATCH(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { authorizationId } = body;
  if (!authorizationId) return Response.json({ error: 'authorizationId es requerido' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const { data: authRequest, error: authError } = await loadAuthorizationOrg(supabase, authorizationId);
  if (authError) return Response.json({ error: 'Error verificando la solicitud' }, { status: 500 });
  if (!authRequest) return Response.json({ error: 'Solicitud de autorización no encontrada' }, { status: 404 });
  if (!isDutyManager(memberships, authRequest.organization_id)) {
    return Response.json({ error: 'Solo un gestor (Jefe de Pilotos) puede firmar el análisis de riesgos' }, { status: 403 });
  }

  const { data: existing, error: existingError } = await supabase
    .from('risk_analyses')
    .select('*')
    .eq('authorization_id', authorizationId)
    .maybeSingle();
  if (existingError) return Response.json({ error: 'Error leyendo el análisis' }, { status: 500 });
  if (!existing) return Response.json({ error: 'No hay un análisis de riesgos diligenciado para esta solicitud' }, { status: 404 });

  const evaluation = evaluateRiskAnalysis(existing.hazards || []);
  if (!evaluation.canSign) {
    return Response.json({ error: 'El análisis tiene peligros sin conformar — no puede firmarse todavía', evaluation }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('risk_analyses')
    .update({ can_sign: true, signed_by: personId, signed_at: new Date().toISOString() })
    .eq('authorization_id', authorizationId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ riskAnalysis: data });
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const authorizationId = searchParams.get('authorizationId');
  if (!authorizationId) return Response.json({ error: 'authorizationId es requerido' }, { status: 400 });

  const { data, error } = await supabase
    .from('risk_analyses')
    .select('*')
    .eq('authorization_id', authorizationId)
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ riskAnalysis: data });
}
