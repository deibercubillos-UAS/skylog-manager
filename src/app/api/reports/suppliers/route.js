import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Auditorías de proveedores en un rango de fechas — todas o de un solo proveedor.
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const supplierId = searchParams.get('supplierId');

        if ((from && !DATE_REGEX.test(from)) || (to && !DATE_REGEX.test(to))) {
            return NextResponse.json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' }, { status: 400 });
        }

        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSuppliers.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        let query = supabase
            .from('supplier_audits')
            .select('audit_date, auditor_name, responses, supplier:supplier_id(name, category)')
            .eq('organization_id', orgId)
            .order('audit_date', { ascending: true });

        if (from) query = query.gte('audit_date', from);
        if (to)   query = query.lte('audit_date', to);
        if (supplierId) query = query.eq('supplier_id', supplierId);

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
