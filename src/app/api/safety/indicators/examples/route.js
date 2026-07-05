import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { EXAMPLE_INDICATORS } from '@/lib/safetyIndicatorStats';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/safety/indicators/examples — carga un set de indicadores SPI de
// ejemplo (solo definiciones: nombre/denominador/descripción — SIN datos
// mensuales inventados) para guiar a la organización sobre qué suele medir
// un explotador UAS. Idempotente por nombre: si ya existe un indicador con
// el mismo nombre en la org, se omite (no duplica en clics repetidos).
export async function POST() {
    try {
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSMS.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const { data: existing } = await supabase
            .from('safety_indicators')
            .select('name')
            .eq('organization_id', orgId);
        const existingNames = new Set((existing || []).map(i => i.name));

        const toInsert = EXAMPLE_INDICATORS
            .filter(ex => !existingNames.has(ex.name))
            .map(ex => ({ ...ex, organization_id: orgId, created_by: user.id }));

        if (toInsert.length === 0) {
            return NextResponse.json({ inserted: 0, indicators: [] });
        }

        const { data, error } = await supabase
            .from('safety_indicators')
            .insert(toInsert)
            .select();

        if (error) throw error;
        return NextResponse.json({ inserted: data?.length || 0, indicators: data || [] }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
