// Skylog V2.0 — Suscripción: panel informativo + gestión manual del plan
// (sin checkout, sin ePayco — confirmado con el usuario). Deliberadamente
// más restrictivo que el resto de V2: solo `admin`/`superadmin` gestionan
// (nunca `jefe_pilotos`/`gerente_sms`) — replica un bug real ya corregido
// en v1 (CLAUDE.md: "/dashboard/subscription usaba el permiso equivocado
// — canManageFleet en vez de un permiso propio... canManageSubscription:
// ['superadmin','admin']"), no se repite ese error aquí desde el inicio.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { PLANS, PLAN_LIMITS, crewCountsForLimit } from '@/lib/v2/planLimits';

function isAdmin(memberships, organizationId) {
  return (memberships || []).some((m) => m.organization_id === organizationId && ['admin', 'superadmin'].includes(m.role));
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

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  const orgIds = (memberships || []).map((m) => m.organization_id);
  if (!orgIds.includes(organizationId)) return Response.json({ error: 'Sin membresía activa en esa organización' }, { status: 403 });

  const [{ data: subscription, error: subError }, { data: aircraft, error: aircraftError }, { data: crew, error: crewError }, { data: batteries, error: batteriesError }] = await Promise.all([
    supabase.from('subscriptions').select('*').eq('organization_id', organizationId).maybeSingle(),
    supabase.from('aircraft').select('id').eq('organization_id', organizationId),
    supabase.from('memberships').select('role').eq('organization_id', organizationId).eq('status', 'activa'),
    supabase.from('batteries').select('id').eq('organization_id', organizationId),
  ]);
  if (subError) return Response.json({ error: subError.message }, { status: 500 });
  if (aircraftError) return Response.json({ error: aircraftError.message }, { status: 500 });
  if (crewError) return Response.json({ error: crewError.message }, { status: 500 });
  if (batteriesError) return Response.json({ error: batteriesError.message }, { status: 500 });

  const plan = subscription?.plan || 'piloto';
  const usage = {
    aircraft: { count: (aircraft || []).length, limit: PLAN_LIMITS[plan].aircraft },
    pilots: { count: (crew || []).filter((m) => crewCountsForLimit(m.role)).length, limit: PLAN_LIMITS[plan].pilots },
    batteries: { count: (batteries || []).length, limit: PLAN_LIMITS[plan].batteries },
  };

  return Response.json({ subscription: subscription || { organization_id: organizationId, plan: 'piloto', expires_at: null, notes: null }, usage, isAdmin: isAdmin(memberships, organizationId) });
}

export async function PATCH(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, plan, expiresAt, notes } = body;
  if (!organizationId || !plan) return Response.json({ error: 'organizationId y plan son requeridos' }, { status: 400 });
  if (!PLANS.includes(plan)) return Response.json({ error: 'plan inválido' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isAdmin(memberships, organizationId)) {
    return Response.json({ error: 'Solo el Gerente General puede cambiar el plan de la organización' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('subscriptions')
    .upsert(
      { organization_id: organizationId, plan, expires_at: expiresAt || null, notes: notes?.trim() || null, updated_by: personId, updated_at: new Date().toISOString() },
      { onConflict: 'organization_id' }
    )
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ subscription: data });
}
