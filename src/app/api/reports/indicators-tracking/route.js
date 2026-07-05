import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { computeRate, computeYearStats } from '@/lib/safetyIndicatorStats';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Enumera los periodos YYYY-MM entre dos fechas ISO (inclusive)
function monthsBetween(from, to) {
    const periods = [];
    let d = new Date(`${from}-01T00:00:00`);
    const end = new Date(`${to}-01T00:00:00`);
    while (d <= end) {
        periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        d.setMonth(d.getMonth() + 1);
    }
    return periods;
}

// Seguimiento de Indicadores SPI — estado ACTUAL por periodo (no el envío
// anual): tasa mensual de cada indicador comparada contra sus líneas de
// alerta (mismo cálculo que /dashboard/safety, lib/safetyIndicatorStats.js —
// promedio + N·desviación estándar poblacional del año anterior completo) +
// planes de acción todavía abiertos. Complementa al Excel anual
// (F-SMS-010), no lo reemplaza — decisión confirmada con el usuario. Para
// el reporte descargable en /dashboard/reports.
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        if (!from || !to) return NextResponse.json({ error: 'Rango de fechas requerido' }, { status: 400 });

        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canViewAudit.includes(role)) return NextResponse.json({ error: 'Sin permisos para ver reportes' }, { status: 403 });

        const periods = monthsBetween(from.slice(0, 7), to.slice(0, 7));
        const years = [...new Set(periods.map(p => parseInt(p.slice(0, 4), 10)))];
        const baselineYears = [...new Set(years.map(y => y - 1))];
        const neededYears = new Set([...years, ...baselineYears].map(String));

        const { data: indicators, error } = await supabase
            .from('safety_indicators')
            .select(`
                id, name, denominator_unit,
                monthly:safety_indicator_monthly(period, denominator_value, event_count),
                actions:safety_indicator_actions(action_plan, status, defense_type, root_cause, execution_days, created_at)
            `)
            .eq('organization_id', orgId)
            .order('name');
        if (error) throw error;

        const tracking = [];
        const openActions = [];

        (indicators || []).forEach(ind => {
            const monthly = (ind.monthly || []).filter(m => neededYears.has(m.period.slice(0, 4)));
            const monthlyByPeriod = {};
            monthly.forEach(m => { monthlyByPeriod[m.period] = m; });

            const statsByYear = {};
            years.forEach(y => {
                const baselineRows = monthly.filter(m => m.period.slice(0, 4) === String(y - 1));
                statsByYear[y] = computeYearStats(baselineRows, y - 1);
            });

            periods.forEach(period => {
                const row = monthlyByPeriod[period];
                const year = parseInt(period.slice(0, 4), 10);
                const stats = statsByYear[year];
                if (!row) {
                    tracking.push({ indicator: ind.name, period, rate: null, zone: 'sin_dato' });
                    return;
                }
                const rate = computeRate(row.event_count, row.denominator_value);
                let zone = 'sin_linea_base';
                if (stats) {
                    zone = rate <= stats.alert1 ? 'normal' : rate <= stats.alert2 ? 'alerta1' : rate <= stats.alert3 ? 'alerta2' : 'alerta3';
                }
                tracking.push({ indicator: ind.name, period, rate: Math.round(rate * 100) / 100, zone });
            });

            (ind.actions || []).filter(a => a.status !== 'completado').forEach(a => {
                openActions.push({
                    indicator: ind.name,
                    action_plan: a.action_plan,
                    defense_type: a.defense_type,
                    root_cause: a.root_cause,
                    status: a.status,
                });
            });
        });

        return NextResponse.json({ tracking, openActions });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
