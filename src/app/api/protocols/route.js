import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['Prevuelo', 'Reportes', 'Seguridad Operacional', 'Mantenimiento'];

// GET /api/protocols — lista los protocolos de la org
export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { user, orgId } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });

        const { data, error } = await supabase
            .from('protocols')
            .select('id,name,category,description,icon,steps,updated_at')
            .eq('organization_id', orgId)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/protocols — crea un protocolo nuevo
export async function POST(request) {
    try {
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canViewFinance.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const body = await request.json();
        if (!body.name?.trim()) return NextResponse.json({ error: 'El nombre del protocolo es obligatorio' }, { status: 400 });
        if (!CATEGORIES.includes(body.category)) return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 });

        const steps = Array.isArray(body.steps) ? body.steps.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim()) : [];

        const { data, error } = await supabase
            .from('protocols')
            .insert([{
                organization_id: orgId,
                name:            body.name.trim(),
                category:        body.category,
                description:     body.description?.trim() || null,
                icon:            body.icon?.trim() || 'checklist',
                steps,
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
