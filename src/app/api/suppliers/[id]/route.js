import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_FIELDS = ['name', 'category', 'tax_id', 'contact_name', 'contact_email', 'contact_phone', 'address', 'status', 'notes'];
const TEXT_FIELDS = ['category', 'tax_id', 'contact_name', 'contact_email', 'contact_phone', 'address', 'notes'];

// PATCH /api/suppliers/[id] — edita un proveedor existente
export async function PATCH(request, { params }) {
    try {
        const { id } = await params;
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSuppliers.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const body = await request.json();
        if (body.status !== undefined && !['activo', 'inactivo'].includes(body.status)) {
            return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
        }

        const cleanData = {};
        for (const f of ALLOWED_FIELDS) {
            if (body[f] === undefined) continue;
            if (f === 'name') {
                if (!body.name?.trim()) return NextResponse.json({ error: 'El nombre del proveedor es obligatorio' }, { status: 400 });
                cleanData.name = body.name.trim();
            } else if (TEXT_FIELDS.includes(f)) {
                cleanData[f] = body[f]?.trim() || null;
            } else {
                cleanData[f] = body[f];
            }
        }
        cleanData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('suppliers')
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

// DELETE /api/suppliers/[id] — elimina un proveedor (y sus auditorías, cascade)
export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSuppliers.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const { error } = await supabase
            .from('suppliers')
            .delete()
            .eq('id', id)
            .eq('organization_id', orgId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
