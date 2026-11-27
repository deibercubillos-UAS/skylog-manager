// Skylog V2.0 — SMS Tarjeta de riesgo: configuración del enlace listas↔riesgo.
// GET devuelve los umbrales y los pesos por paso; PUT guarda los umbrales.
// Ver: miembros que ven la matriz (P1). Configurar: gestor SMS (P2).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanView, membershipsCanEdit } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';
import { dbError } from '@/lib/v2/apiErrors';

export async function GET(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!membershipsCanView(memberships, organizationId, 'P1')) {
    return Response.json({ error: 'Sin acceso a la tarjeta de riesgo' }, { status: 403 });
  }

  const [configRes, weightsRes] = await Promise.all([
    supabase.from('risk_card_config').select('tolerable_threshold, inaceptable_threshold').eq('organization_id', organizationId).maybeSingle(),
    supabase.from('risk_card_weights').select('checklist_id, position, weight').eq('organization_id', organizationId),
  ]);
  if (configRes.error) return dbError(configRes.error, 'sms/risk-card');
  if (weightsRes.error) return dbError(weightsRes.error, 'sms/risk-card');

  return Response.json({
    config: configRes.data || null,
    weights: weightsRes.data || [],
    isManager: membershipsCanEdit(memberships, organizationId, 'P2'),
  });
}

export async function PUT(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, tolerableThreshold, inaceptableThreshold } = body;
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const tol = Number(tolerableThreshold);
  const ina = Number(inaceptableThreshold);
  if (!Number.isInteger(tol) || tol < 0) return Response.json({ error: 'El umbral tolerable debe ser un entero ≥ 0' }, { status: 400 });
  if (!Number.isInteger(ina) || ina <= tol) return Response.json({ error: 'El umbral inaceptable debe ser un entero mayor que el tolerable' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!membershipsCanEdit(memberships, organizationId, 'P2')) {
    return Response.json({ error: 'Solo un gestor puede configurar la tarjeta de riesgo' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('risk_card_config')
    .upsert(
      { organization_id: organizationId, tolerable_threshold: tol, inaceptable_threshold: ina, updated_by: personId, updated_at: new Date().toISOString() },
      { onConflict: 'organization_id' },
    )
    .select('tolerable_threshold, inaceptable_threshold')
    .single();
  if (error) return dbError(error, 'sms/risk-card');
  return Response.json({ config: data });
}
