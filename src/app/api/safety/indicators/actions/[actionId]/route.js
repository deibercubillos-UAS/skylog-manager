import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFENSE_TYPES = ['T', 'R', 'E'];
const STATUSES = ['pendiente', 'en_progreso', 'completado'];
const ALLOWED_FIELDS = ['defense_type', 'root_cause', 'trigger_factor', 'action_plan', 'document_ref', 'execution_days', 'status'];

// PATCH /api/safety/indicators/actions/[actionId] — edita una fila de plan de acción
export async function PATCH(request, { params }) {
    try {
        const { actionId } = await params;
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSMS.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const body = await request.json();
        if (body.defense_type && !DEFENSE_TYPES.includes(body.defense_type)) {
            return NextResponse.json({ error: 'Tipo de defensa inválido' }, { status: 400 });
        }
        if (body.status !== undefined && !STATUSES.includes(body.status)) {
            return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
        }

        const cleanData = {};
        for (const f of ALLOWED_FIELDS) {
            if (body[f] === undefined) continue;
            if (f === 'action_plan') {
                if (!body.action_plan?.trim()) return NextResponse.json({ error: 'El plan de acción es obligatorio' }, { status: 400 });
                cleanData.action_plan = body.action_plan.trim();
            } else if (['root_cause', 'trigger_factor', 'document_ref'].includes(f)) {
                cleanData[f] = body[f]?.trim() || null;
            } else if (f === 'execution_days') {
                cleanData[f] = body[f] ? Number(body[f]) : null;
            } else {
                cleanData[f] = body[f] || null;
            }
        }
        cleanData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('safety_indicator_actions')
            .update(cleanData)
            .eq('id', actionId)
            .eq('organization_id', orgId)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE /api/safety/indicators/actions/[actionId]
export async function DELETE(request, { params }) {
    try {
        const { actionId } = await params;
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSMS.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const { error } = await supabase
            .from('safety_indicator_actions')
            .delete()
            .eq('id', actionId)
            .eq('organization_id', orgId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
