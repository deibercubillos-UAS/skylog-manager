import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DENOMINATOR_UNITS = ['ciclos_vuelo', 'horas_vuelo', 'horas_hombre', 'operaciones'];

// GET /api/safety/indicators — catálogo de indicadores SPI de la org, con
// sus datos mensuales y planes de acción anidados (una sola consulta).
export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { user, orgId } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });

        const { data, error } = await supabase
            .from('safety_indicators')
            .select('*, monthly:safety_indicator_monthly(*), actions:safety_indicator_actions(*)')
            .eq('organization_id', orgId)
            .order('name');

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/safety/indicators — crea un indicador nuevo
export async function POST(request) {
    try {
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSMS.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const body = await request.json();
        if (!body.name?.trim()) return NextResponse.json({ error: 'El nombre del indicador es obligatorio' }, { status: 400 });
        if (!DENOMINATOR_UNITS.includes(body.denominator_unit)) {
            return NextResponse.json({ error: 'Denominador inválido' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('safety_indicators')
            .insert([{
                organization_id: orgId,
                name: body.name.trim(),
                denominator_unit: body.denominator_unit,
                expected_improvement_pct: Number(body.expected_improvement_pct) || 0.1,
                description: body.description?.trim() || null,
                created_by: user.id,
            }])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
