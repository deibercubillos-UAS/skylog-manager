// Skylog V2.0 — Flota & Equipo, Fase 1. Aeronave (30-entidades.md §3.1): la
// unidad física — serie, RUAS, propiedad, horas acumuladas. `total_hours` es
// ② derivado: nunca se acepta del cliente en el POST, solo se toca vía
// `increment_aircraft_hours()` (RPC, mismo patrón anti-drift de v1: "usar
// RPC, nunca read-calculate-write").
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

// Nunca se expone la ruta de la foto: solo si hay una cargada.
const publicAircraft = ({ image_path, ...a }) => ({ ...a, has_image: !!image_path });

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

  const { data: aircraft, error } = await supabase
    .from('aircraft')
    .select('*, model:model_id(brand, model, category)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) return Response.json({ error: 'Error consultando la flota' }, { status: 500 });

  return Response.json({ aircraft: (aircraft || []).map(publicAircraft), isManager: isDutyManager(memberships, organizationId) });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, modelId, serialNumber, ruasNumber } = body;
  if (!organizationId || !modelId || !serialNumber) {
    return Response.json({ error: 'organizationId, modelId y serialNumber son requeridos' }, { status: 400 });
  }

  const { error: resolveError, memberships, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede registrar aeronaves' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('aircraft')
    .insert({
      organization_id: organizationId,
      model_id: modelId,
      serial_number: serialNumber,
      ruas_number: ruasNumber || null,
      created_by: personId,
    })
    .select('*, model:model_id(brand, model, category)')
    .single();

  if (error) {
    if (error.code === '23505') return Response.json({ error: 'Ya existe una aeronave con ese número de serie en esta organización' }, { status: 409 });
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ aircraft: publicAircraft(data) });
}
