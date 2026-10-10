// Skylog V2.0 — Flota & Equipo, Fase 2. Batería (30-entidades.md §3.2):
// unidad con serie, ciclos y salud — intercambiable por diseño, sin
// `aircraft_id` (una batería no pertenece a una aeronave, mismo criterio ya
// documentado en producción). `cycles` es ② derivado: nunca se acepta del
// cliente en el POST, solo se toca vía `increment_battery_cycles()`.
import { logAudit } from '@/lib/v2/auditLog';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { orgCapacity, capacityMessage } from '@/lib/v2/planCapacity';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

const HEALTH_STATUSES = ['buena', 'regular', 'mala'];

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const orgIds = (memberships || []).map((m) => m.organization_id);
  if (!organizationId || !orgIds.includes(organizationId)) {
    return Response.json({ error: 'organizationId requerido y con membresía activa' }, { status: 400 });
  }

  const { data: batteries, error } = await supabase
    .from('batteries')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) return Response.json({ error: 'Error consultando baterías' }, { status: 500 });

  return Response.json({ batteries, isManager: isDutyManager(memberships, organizationId) });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, serialNumber, brand, model, healthStatus } = body;
  if (!organizationId || !serialNumber) {
    return Response.json({ error: 'organizationId y serialNumber son requeridos' }, { status: 400 });
  }
  if (healthStatus && !HEALTH_STATUSES.includes(healthStatus)) {
    return Response.json({ error: 'healthStatus debe ser uno de: ' + HEALTH_STATUSES.join(', ') }, { status: 400 });
  }

  const { error: resolveError, memberships, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede registrar baterías' }, { status: 403 });
  }

  const capacity = await orgCapacity(createAdminClient(), organizationId, 'batteries');
  if (capacity.room < 1) return Response.json({ error: capacityMessage('batteries', capacity), reason: 'limite_plan' }, { status: 409 });

  const { data, error } = await supabase
    .from('batteries')
    .insert({
      organization_id: organizationId,
      serial_number: serialNumber,
      brand: brand || null,
      model: model || null,
      health_status: healthStatus || null,
      created_by: personId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return Response.json({ error: 'Ya existe una batería con ese número de serie en esta organización' }, { status: 409 });
    return Response.json({ error: error.message }, { status: 500 });
  }
  await logAudit({ organizationId, action: 'create', module: 'Baterías', entityLabel: `Batería ${serialNumber}` });
  return Response.json({ battery: data });
}
