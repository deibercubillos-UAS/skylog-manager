import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Campos que se pueden actualizar en una aeronave.
// Bloqueados: organization_id, owner_id, id, created_at.
const ALLOWED_AIRCRAFT_FIELDS = [
  'model', 'brand', 'serial_number', 'registration_number',
  'weight_grams', 'max_takeoff_weight', 'max_flight_time_min',
  'battery_type', 'drone_class', 'notes', 'status',
  'total_hours', 'last_maintenance_date', 'last_maintenance_hours',
  'image_url', 'purchase_date', 'insurance_expiry', 'remote_id',
  'color', 'firmware_version', 'category', 'ruas',
  // Mantenimiento configurable
  'maintenance_interval_hours', 'maintenance_interval_days',
  'operational_status',
];

// Evalúa si la aeronave debería entrar en mantenimiento según sus contadores.
// Retorna 'en_mantenimiento' si supera algún umbral, null si no aplica.
function calcAutoStatus(aircraft) {
  const hours   = parseFloat(aircraft.total_hours || 0);
  const lastH   = parseFloat(aircraft.last_maintenance_hours || 0);
  const intH    = parseInt(aircraft.maintenance_interval_hours || 0, 10);
  const intD    = parseInt(aircraft.maintenance_interval_days || 0, 10);

  if (intH > 0 && (hours - lastH) >= intH) return 'en_mantenimiento';

  if (intD > 0 && aircraft.last_maintenance_date) {
    const lastDate = new Date(aircraft.last_maintenance_date);
    const daysSince = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
    if (daysSince >= intD) return 'en_mantenimiento';
  }

  return null;
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { updateData } = body;

    const supabase = await createClientSSR();
    const { orgId } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    if (!updateData || typeof updateData !== 'object') {
      return NextResponse.json({ error: 'updateData requerido' }, { status: 400 });
    }

    // Allowlist: bloquear campos que no deben actualizarse desde el cliente
    const safeUpdate = Object.fromEntries(
      Object.entries(updateData).filter(([key]) => ALLOWED_AIRCRAFT_FIELDS.includes(key))
    );

    if (Object.keys(safeUpdate).length === 0) {
      return NextResponse.json({ error: 'No hay campos válidos para actualizar' }, { status: 400 });
    }

    // Leer estado actual para calcular auto-status
    const { data: current } = await supabase
      .from('aircraft')
      .select('total_hours, last_maintenance_hours, last_maintenance_date, maintenance_interval_hours, maintenance_interval_days, operational_status')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    // Combinar estado actual + cambios entrantes para evaluar umbrales
    const merged = { ...(current || {}), ...safeUpdate };

    // Solo calcular auto-status si el cliente no lo está cambiando manualmente
    if (!('operational_status' in safeUpdate)) {
      const autoStatus = calcAutoStatus(merged);
      if (autoStatus && merged.operational_status !== 'en_mantenimiento') {
        safeUpdate.operational_status = autoStatus;
        safeUpdate.last_status_change = new Date().toISOString();
      }
    } else if (safeUpdate.operational_status === 'disponible') {
      // El técnico marca como disponible manualmente → registrar el cambio
      safeUpdate.last_status_change = new Date().toISOString();
    }

    // Solo actualiza si la aeronave pertenece a la organización del usuario
    const { data, error } = await supabase
      .from('aircraft')
      .update({ ...safeUpdate, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select();

    if (error) throw error;
    if (!data?.length) return NextResponse.json({ error: 'Aeronave no encontrada en tu organización' }, { status: 404 });
    return NextResponse.json(data[0]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
