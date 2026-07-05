import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/suppliers/criteria — catálogo de criterios de auditoría de la org
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
            .from('supplier_audit_criteria')
            .select('*')
            .eq('organization_id', orgId)
            .order('order_index', { ascending: true });

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/suppliers/criteria — agrega un criterio nuevo al checklist
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
        if (!body.criterion?.trim()) return NextResponse.json({ error: 'El criterio es obligatorio' }, { status: 400 });

        const { data: last } = await supabase
            .from('supplier_audit_criteria')
            .select('order_index')
            .eq('organization_id', orgId)
            .order('order_index', { ascending: false })
            .limit(1)
            .maybeSingle();
        const nextOrder = (last?.order_index ?? -1) + 1;

        const { data, error } = await supabase
            .from('supplier_audit_criteria')
            .insert([{
                organization_id: orgId,
                criterion:       body.criterion.trim(),
                category:        body.category?.trim() || null,
                order_index:     nextOrder,
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
