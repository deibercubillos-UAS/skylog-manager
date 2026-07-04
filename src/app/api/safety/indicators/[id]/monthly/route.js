import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

// POST /api/safety/indicators/[id]/monthly — carga (upsert) el dato de un mes
// { period: 'YYYY-MM', denominator_value, event_count }
export async function POST(request, { params }) {
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
        if (!PERIOD_REGEX.test(body.period || '')) {
            return NextResponse.json({ error: 'Formato de período inválido. Use YYYY-MM' }, { status: 400 });
        }

        // Verifica que el indicador pertenezca a la org antes de escribir.
        const { data: indicator } = await supabase
            .from('safety_indicators').select('id').eq('id', id).eq('organization_id', orgId).maybeSingle();
        if (!indicator) return NextResponse.json({ error: 'Indicador no encontrado' }, { status: 404 });

        const { data, error } = await supabase
            .from('safety_indicator_monthly')
            .upsert({
                organization_id: orgId,
                indicator_id: id,
                period: body.period,
                denominator_value: Number(body.denominator_value) || 0,
                event_count: Number(body.event_count) || 0,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'indicator_id,period' })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
