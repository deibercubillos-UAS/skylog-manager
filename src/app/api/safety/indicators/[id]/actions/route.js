import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFENSE_TYPES = ['T', 'R', 'E'];
const STATUSES = ['pendiente', 'en_progreso', 'completado'];

// POST /api/safety/indicators/[id]/actions — agrega una fila de plan de
// acción (defensa/causa raíz/desencadenante) al indicador
export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSMS.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const body = await request.json();
        if (!body.action_plan?.trim()) return NextResponse.json({ error: 'El plan de acción es obligatorio' }, { status: 400 });
        if (body.defense_type && !DEFENSE_TYPES.includes(body.defense_type)) {
            return NextResponse.json({ error: 'Tipo de defensa inválido' }, { status: 400 });
        }
        const status = STATUSES.includes(body.status) ? body.status : 'pendiente';

        const { data: indicator } = await supabase
            .from('safety_indicators').select('id').eq('id', id).eq('organization_id', orgId).maybeSingle();
        if (!indicator) return NextResponse.json({ error: 'Indicador no encontrado' }, { status: 404 });

        const { data, error } = await supabase
            .from('safety_indicator_actions')
            .insert([{
                organization_id: orgId,
                indicator_id: id,
                defense_type: body.defense_type || null,
                root_cause: body.root_cause?.trim() || null,
                trigger_factor: body.trigger_factor?.trim() || null,
                action_plan: body.action_plan.trim(),
                document_ref: body.document_ref?.trim() || null,
                execution_days: body.execution_days ? Number(body.execution_days) : null,
                status,
            }])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
