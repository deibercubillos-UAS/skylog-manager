import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/suppliers/audits?supplier_id= — lista auditorías (opcionalmente de un solo proveedor)
export async function GET(request) {
    try {
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSuppliers.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const supplierId = searchParams.get('supplier_id');

        let query = supabase
            .from('supplier_audits')
            .select('*, supplier:supplier_id(name, category)')
            .eq('organization_id', orgId)
            .order('audit_date', { ascending: false });

        if (supplierId) query = query.eq('supplier_id', supplierId);

        const { data, error } = await query;
        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/suppliers/audits — registra una nueva auditoría
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
        if (!body.supplier_id) return NextResponse.json({ error: 'El proveedor es obligatorio' }, { status: 400 });

        // Verificar que el proveedor pertenezca a la misma organización
        const { data: supplier } = await supabase
            .from('suppliers')
            .select('id')
            .eq('id', body.supplier_id)
            .eq('organization_id', orgId)
            .maybeSingle();
        if (!supplier) return NextResponse.json({ error: 'Proveedor inválido' }, { status: 400 });

        const { data, error } = await supabase
            .from('supplier_audits')
            .insert([{
                organization_id: orgId,
                supplier_id:     body.supplier_id,
                audit_date:      body.audit_date || new Date().toISOString().slice(0, 10),
                auditor_name:    body.auditor_name?.trim() || null,
                responses:       body.responses && typeof body.responses === 'object' ? body.responses : {},
                overall_notes:   body.overall_notes?.trim() || null,
                created_by:      user.id,
            }])
            .select('*, supplier:supplier_id(name, category)')
            .single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
