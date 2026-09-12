// Skylog V2.0 — F3. Matriz de riesgo SMS interna — configurable por
// organización (regla C3, distinta de la matriz fija de F4a). Solo gestores
// configuran; cualquier miembro lee (transparencia del SMS).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { validateMatrixCompleteness } from '@skylog/domain';

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
    .from('risk_matrices')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ riskMatrix: data });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, probabilityLevels, severityLevels, tolerability } = body;
  if (!organizationId || !Array.isArray(probabilityLevels) || !Array.isArray(severityLevels) || !Array.isArray(tolerability)) {
    return Response.json({ error: 'organizationId, probabilityLevels, severityLevels y tolerability (arrays) son requeridos' }, { status: 400 });
  }

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede configurar la matriz de riesgo del SMS' }, { status: 403 });
  }

  const completeness = validateMatrixCompleteness(probabilityLevels, severityLevels, tolerability);

  const { data, error } = await supabase
    .from('risk_matrices')
    .upsert(
      { organization_id: organizationId, probability_levels: probabilityLevels, severity_levels: severityLevels, tolerability, updated_by: personId, updated_at: new Date().toISOString() },
      { onConflict: 'organization_id' }
    )
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ riskMatrix: data, completeness });
}
