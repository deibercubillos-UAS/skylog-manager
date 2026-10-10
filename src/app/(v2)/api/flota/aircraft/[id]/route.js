// Skylog V2.0 — Flota & Equipo. PATCH acotado: identificación (serie, RUAS),
// firmware y estado operacional — `total_hours` nunca se acepta aquí
// (② derivado, solo vía RPC `increment_aircraft_hours`). `fuera_de_servicio`
// (a pedido explícito del usuario) es un tercer estado, distinto de
// `en_mantenimiento` — nunca borra la aeronave ni su historial de vuelos o
// mantenimiento, solo la saca de la flota activa (fuera del alcance de este
// endpoint: los selectores de Programación/Bitácora/Mantenimiento y las
// estadísticas de `/flota` filtran este estado del lado del cliente).
import { logAudit } from '@/lib/v2/auditLog';
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

const publicAircraft = ({ image_path, ...a }) => ({ ...a, has_image: !!image_path });

const ALLOWED_FIELDS = [
  'operational_status', 'firmware_version', 'firmware_previous_version', 'firmware_backup_path',
  'ruas_number', 'serial_number', 'ownership_type', 'ownership_reference', 'actual_weight_kg',
];
const STATUSES = ['disponible', 'en_mantenimiento', 'fuera_de_servicio'];
const OWNERSHIP_TYPES = ['propiedad', 'arrendamiento', 'comodato'];

export async function PATCH(request, { params }) {
  params = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const { data: existing, error: fetchError } = await supabase.from('aircraft').select('organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: 'Error consultando la aeronave' }, { status: 500 });
  if (!existing) return Response.json({ error: 'Aeronave no encontrada' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, existing.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede editar aeronaves' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.operational_status && !STATUSES.includes(body.operational_status)) {
    return Response.json({ error: 'operational_status debe ser uno de: ' + STATUSES.join(', ') }, { status: 400 });
  }
  if (body.ownership_type && !OWNERSHIP_TYPES.includes(body.ownership_type)) {
    return Response.json({ error: 'ownership_type debe ser uno de: ' + OWNERSHIP_TYPES.join(', ') }, { status: 400 });
  }

  if (body.actual_weight_kg !== undefined && body.actual_weight_kg !== null && !(Number(body.actual_weight_kg) > 0)) {
    return Response.json({ error: 'El peso real debe ser un número mayor que cero' }, { status: 400 });
  }

  const patch = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  if (patch.firmware_version) patch.firmware_updated_at = new Date().toISOString();
  if (Object.keys(patch).length === 0) return Response.json({ error: 'Nada para actualizar' }, { status: 400 });

  const { data, error } = await supabase
    .from('aircraft')
    .update(patch)
    .eq('id', id)
    .select('*, model:model_id(brand, model, category)')
    .single();

  if (error) {
    if (error.code === '23505') return Response.json({ error: 'Ya existe una aeronave con ese número de serie en esta organización' }, { status: 409 });
    return Response.json({ error: error.message }, { status: 500 });
  }
  await logAudit({ organizationId: data.organization_id, action: 'update', module: 'Aeronaves', entityLabel: `Aeronave ${data.serial_number}` });
  return Response.json({ aircraft: publicAircraft(data) });
}
