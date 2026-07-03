import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['Técnica', 'Procedimental', 'Humana', 'Organizacional'];
const STATUSES = ['Activa', 'En revisión', 'Retirada'];
const ALLOWED_FIELDS = ['name', 'category', 'description', 'hazard', 'sora_assessment_id', 'responsible', 'status'];

// PATCH /api/safety/barriers/[id] — edita una barrera existente
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
        if (body.category !== undefined && !CATEGORIES.includes(body.category)) {
            return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 });
        }
        if (body.status !== undefined && !STATUSES.includes(body.status)) {
            return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
        }

        const cleanData = {};
        for (const f of ALLOWED_FIELDS) {
            if (body[f] === undefined) continue;
            if (f === 'name') {
                if (!body.name?.trim()) return NextResponse.json({ error: 'El nombre de la barrera es obligatorio' }, { status: 400 });
                cleanData.name = body.name.trim();
            } else if (['description', 'hazard', 'responsible'].includes(f)) {
                cleanData[f] = body[f]?.trim() || null;
            } else {
                cleanData[f] = body[f] || null;
            }
        }
        cleanData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('safety_barriers')
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

// DELETE /api/safety/barriers/[id]
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
            .from('safety_barriers')
            .delete()
            .eq('id', id)
            .eq('organization_id', orgId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
