import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Campos editables de un registro de mantenimiento ya creado. A propósito NO
// se tocan aquí `next_maintenance_date`/`operational_status` (aircraft) ni
// `components` (aircraft_components/maintenance_components) — esos son
// efectos que solo tienen sentido al REGISTRAR un mantenimiento nuevo
// (POST /api/maintenance); reaplicarlos al editar un registro histórico
// (p.ej. corregir el nombre del técnico de hace 2 meses) resetearía el
// estado actual de la aeronave o duplicaría eventos de trazabilidad de
// componentes que ya ocurrieron. Si se necesita registrar un cambio de
// componente o reprogramar la próxima fecha, se crea un nuevo registro.
const EDITABLE_FIELDS = [
  'aircraft_id', 'maintenance_type', 'description', 'hours_at_service',
  'technician_name', 'maintenance_date', 'attachment_path', 'return_doc_path',
];

const SELECT = 'id,aircraft_id,maintenance_type,description,hours_at_service,technician_name,maintenance_date,created_at,attachment_path,return_checklist,return_doc_path,aircraft:aircraft_id(model,serial_number,maintenance_interval_hours,maintenance_interval_days,last_maintenance_date,next_maintenance_date,total_hours,operational_status,created_at),components:maintenance_components(component_type,action,part_old,part_new,notes)';

// PATCH /api/maintenance/[id] — edita un registro de mantenimiento existente
export async function PATCH(request, { params }) {
    try {
        const { id } = await params;
        const supabase = await createClientSSR();
        const { orgId, role } = await getOrgContext(supabase);
        if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!PERMISSIONS.canManageOps.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const body = await request.json();
        const update = {};
        for (const key of EDITABLE_FIELDS) {
            if (key in body) update[key] = body[key];
        }

        // return_checklist se normaliza igual que en el POST: compacto { field_number: bool }
        if ('return_checklist' in body) {
            let returnChecklist = null;
            if (body.return_checklist && typeof body.return_checklist === 'object') {
                const compact = {};
                for (const [k, v] of Object.entries(body.return_checklist)) {
                    if (/^\d+$/.test(k) && typeof v === 'boolean') compact[k] = v;
                }
                if (Object.keys(compact).length > 0) returnChecklist = compact;
            }
            update.return_checklist = returnChecklist;
        }

        if (Object.keys(update).length === 0) {
            return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('maintenance_logs')
            .update(update)
            .eq('id', id)
            .eq('organization_id', orgId)
            .select(SELECT)
            .single();

        if (error) throw error;
        if (!data) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });

        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
