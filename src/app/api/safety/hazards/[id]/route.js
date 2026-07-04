import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const STATUSES = ['abierto', 'mitigado', 'cerrado'];
const PROB_CODES = ['1', '2', '3', '4', '5'];
const SEV_CODES = ['A', 'B', 'C', 'D', 'E'];
const ALLOWED_FIELDS = [
    'description', 'initial_probability_code', 'initial_severity_code', 'mitigation',
    'residual_probability_code', 'residual_severity_code', 'responsible', 'due_date', 'status',
];

// PATCH /api/safety/hazards/[id] — edita un peligro existente
export async function PATCH(request, { params }) {
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
        if (body.initial_probability_code !== undefined && !PROB_CODES.includes(body.initial_probability_code)) {
            return NextResponse.json({ error: 'Probabilidad inicial inválida' }, { status: 400 });
        }
        if (body.initial_severity_code !== undefined && !SEV_CODES.includes(body.initial_severity_code)) {
            return NextResponse.json({ error: 'Gravedad inicial inválida' }, { status: 400 });
        }
        if (body.residual_probability_code && !PROB_CODES.includes(body.residual_probability_code)) {
            return NextResponse.json({ error: 'Probabilidad residual inválida' }, { status: 400 });
        }
        if (body.residual_severity_code && !SEV_CODES.includes(body.residual_severity_code)) {
            return NextResponse.json({ error: 'Gravedad residual inválida' }, { status: 400 });
        }
        if (body.status !== undefined && !STATUSES.includes(body.status)) {
            return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
        }

        const cleanData = {};
        for (const f of ALLOWED_FIELDS) {
            if (body[f] === undefined) continue;
            if (f === 'description') {
                if (!body.description?.trim()) return NextResponse.json({ error: 'La descripción del peligro es obligatoria' }, { status: 400 });
                cleanData.description = body.description.trim();
            } else if (['mitigation', 'responsible'].includes(f)) {
                cleanData[f] = body[f]?.trim() || null;
            } else {
                cleanData[f] = body[f] || null;
            }
        }
        cleanData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('safety_hazards')
            .update(cleanData)
            .eq('id', id)
            .eq('organization_id', orgId)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE /api/safety/hazards/[id]
export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSMS.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const { error } = await supabase
            .from('safety_hazards')
            .delete()
            .eq('id', id)
            .eq('organization_id', orgId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
