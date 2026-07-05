import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/suppliers/audits/[id] — detalle de una auditoría (para el reporte individual)
export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSuppliers.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const { data: audit, error } = await supabase
            .from('supplier_audits')
            .select('*, supplier:supplier_id(name, category, tax_id, contact_name)')
            .eq('id', id)
            .eq('organization_id', orgId)
            .single();
        if (error) throw error;

        const { data: criteria } = await supabase
            .from('supplier_audit_criteria')
            .select('id, criterion, category, order_index')
            .eq('organization_id', orgId)
            .order('order_index', { ascending: true });

        return NextResponse.json({ ...audit, criteria: criteria || [] });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PATCH /api/suppliers/audits/[id] — edita una auditoría existente
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
        const cleanData = { updated_at: new Date().toISOString() };
        if (body.audit_date !== undefined) cleanData.audit_date = body.audit_date;
        if (body.auditor_name !== undefined) cleanData.auditor_name = body.auditor_name?.trim() || null;
        if (body.responses !== undefined) cleanData.responses = typeof body.responses === 'object' ? body.responses : {};
        if (body.overall_notes !== undefined) cleanData.overall_notes = body.overall_notes?.trim() || null;

        const { data, error } = await supabase
            .from('supplier_audits')
            .update(cleanData)
            .eq('id', id)
            .eq('organization_id', orgId)
            .select('*, supplier:supplier_id(name, category)')
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE /api/suppliers/audits/[id]
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
            .from('supplier_audits')
            .delete()
            .eq('id', id)
            .eq('organization_id', orgId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
