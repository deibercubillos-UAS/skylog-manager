import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/suppliers — lista los proveedores de la org
export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSuppliers.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('organization_id', orgId)
            .order('name', { ascending: true });

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/suppliers — crea un proveedor nuevo
export async function POST(request) {
    try {
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSuppliers.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const body = await request.json();
        if (!body.name?.trim()) return NextResponse.json({ error: 'El nombre del proveedor es obligatorio' }, { status: 400 });
        if (body.status && !['activo', 'inactivo'].includes(body.status)) {
            return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('suppliers')
            .insert([{
                organization_id: orgId,
                name:            body.name.trim(),
                category:        body.category?.trim() || null,
                tax_id:          body.tax_id?.trim() || null,
                contact_name:    body.contact_name?.trim() || null,
                contact_email:   body.contact_email?.trim() || null,
                contact_phone:   body.contact_phone?.trim() || null,
                address:         body.address?.trim() || null,
                status:          body.status || 'activo',
                notes:           body.notes?.trim() || null,
                created_by:      user.id,
            }])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
