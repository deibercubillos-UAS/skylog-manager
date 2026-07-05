import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/maintenance/minor — el piloto registra el chequeo de Mantenimiento
// Menor de una aeronave, desde /dashboard/maintenance. A diferencia de
// POST /api/maintenance (mantenimiento mayor, técnico), esto NUNCA toca
// last_maintenance_date/_hours (contadores del mantenimiento mayor) — mantiene
// sus propios contadores independientes y limpia minor_maintenance_due para
// des-bloquear el despacho. Mismo permiso que gatea esa página (canManageOps).
export async function POST(request) {
    try {
        const supabase = await createClientSSR();
        const { user, orgId, role, fullName } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageOps.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const body = await request.json();
        if (!body.aircraft_id) return NextResponse.json({ error: 'La aeronave es obligatoria' }, { status: 400 });

        const { data: aircraft } = await supabase
            .from('aircraft')
            .select('id, total_hours')
            .eq('id', body.aircraft_id)
            .eq('organization_id', orgId)
            .maybeSingle();
        if (!aircraft) return NextResponse.json({ error: 'Aeronave inválida' }, { status: 400 });

        // Checklist normalizado: solo claves numéricas con valor booleano.
        let minorChecklist = null;
        if (body.checklist && typeof body.checklist === 'object') {
            const compact = {};
            for (const [k, v] of Object.entries(body.checklist)) {
                if (/^\d+$/.test(k) && typeof v === 'boolean') compact[k] = v;
            }
            if (Object.keys(compact).length > 0) minorChecklist = compact;
        }

        const today = new Date().toISOString().split('T')[0];

        const { data: log, error: logErr } = await supabase
            .from('maintenance_logs')
            .insert([{
                aircraft_id:      body.aircraft_id,
                organization_id:  orgId,
                maintenance_type: 'MENOR',
                description:      body.notes?.trim() || 'Mantenimiento menor (piloto)',
                hours_at_service: aircraft.total_hours,
                technician_name:  fullName || user.email,
                maintenance_date: today,
                minor_checklist:  minorChecklist,
            }])
            .select()
            .single();
        if (logErr) throw logErr;

        const { error: acErr } = await supabase
            .from('aircraft')
            .update({
                last_minor_maintenance_date:  today,
                last_minor_maintenance_hours: aircraft.total_hours,
                minor_maintenance_due:        false,
            })
            .eq('id', body.aircraft_id)
            .eq('organization_id', orgId);
        if (acErr) throw acErr;

        return NextResponse.json(log, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
