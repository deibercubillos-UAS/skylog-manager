import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['Pre-vuelo', 'En vuelo', 'Post-vuelo', 'Emergencia', 'Mantenimiento'];
const ALLOWED_FIELDS = ['name', 'category', 'description', 'icon', 'steps'];

// PATCH /api/protocols/[id] — edita un protocolo existente
export async function PATCH(request, { params }) {
    try {
        const { id } = await params;
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canViewFinance.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const body = await request.json();
        if (body.category !== undefined && !CATEGORIES.includes(body.category)) {
            return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 });
        }

        const cleanData = {};
        for (const f of ALLOWED_FIELDS) {
            if (body[f] === undefined) continue;
            if (f === 'steps') {
                cleanData.steps = Array.isArray(body.steps)
                    ? body.steps.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim())
                    : [];
            } else if (f === 'name') {
                if (!body.name?.trim()) return NextResponse.json({ error: 'El nombre del protocolo es obligatorio' }, { status: 400 });
                cleanData.name = body.name.trim();
            } else if (f === 'description') {
                cleanData.description = body.description?.trim() || null;
            } else {
                cleanData[f] = body[f];
            }
        }
        cleanData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('protocols')
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

// DELETE /api/protocols/[id]
export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canViewFinance.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const { error } = await supabase
            .from('protocols')
            .delete()
            .eq('id', id)
            .eq('organization_id', orgId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
