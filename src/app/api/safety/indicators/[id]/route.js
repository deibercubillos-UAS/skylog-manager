import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DENOMINATOR_UNITS = ['ciclos_vuelo', 'horas_vuelo', 'horas_hombre', 'operaciones'];
const ALLOWED_FIELDS = ['name', 'denominator_unit', 'expected_improvement_pct'];

// PATCH /api/safety/indicators/[id] — edita un indicador existente
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
        if (body.denominator_unit !== undefined && !DENOMINATOR_UNITS.includes(body.denominator_unit)) {
            return NextResponse.json({ error: 'Denominador inválido' }, { status: 400 });
        }

        const cleanData = {};
        for (const f of ALLOWED_FIELDS) {
            if (body[f] === undefined) continue;
            if (f === 'name') {
                if (!body.name?.trim()) return NextResponse.json({ error: 'El nombre del indicador es obligatorio' }, { status: 400 });
                cleanData.name = body.name.trim();
            } else if (f === 'expected_improvement_pct') {
                cleanData[f] = Number(body[f]) || 0;
            } else {
                cleanData[f] = body[f];
            }
        }
        cleanData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('safety_indicators')
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

// DELETE /api/safety/indicators/[id] — elimina el indicador (cascada: datos
// mensuales y planes de acción propios)
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
            .from('safety_indicators')
            .delete()
            .eq('id', id)
            .eq('organization_id', orgId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
