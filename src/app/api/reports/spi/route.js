import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Indicadores de Desempeño en Seguridad Operacional (SPI) del año a reportar,
// con el año anterior incluido (línea base para las líneas de alerta — mismo
// criterio que /dashboard/safety, ver lib/safetyIndicatorStats.js) y los
// planes de acción vigentes de cada indicador — para el reporte anual
// descargable en /dashboard/reports (Fase 8).
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const year = parseInt(searchParams.get('year'), 10);
        if (!year || year < 2000 || year > 2100) {
            return NextResponse.json({ error: 'Año inválido' }, { status: 400 });
        }

        const supabase = await createClientSSR();
        const { user, orgId } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });

        const { data: indicators, error } = await supabase
            .from('safety_indicators')
            .select(`
                id, name, denominator_unit, expected_improvement_pct,
                monthly:safety_indicator_monthly(period, denominator_value, event_count),
                actions:safety_indicator_actions(defense_type, root_cause, trigger_factor, action_plan, document_ref, execution_days, status, created_at)
            `)
            .eq('organization_id', orgId)
            .order('name');
        if (error) throw error;

        // Solo se necesitan los meses del año a reportar y del año anterior
        // (línea base) — el resto de años cargados no aporta al reporte.
        const relevant = new Set([String(year), String(year - 1)]);
        const rows = (indicators || []).map(ind => ({
            ...ind,
            monthly: (ind.monthly || []).filter(m => relevant.has(m.period.slice(0, 4))),
        }));

        return NextResponse.json({ year, indicators: rows });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
