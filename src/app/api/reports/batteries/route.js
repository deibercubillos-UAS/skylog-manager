import { createClientSSR } from '@/lib/supabaseServer';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

// Registro de baterías — snapshot por batería (antes era una fila por vuelo/misión).
// "Ciclos totales" es acumulado hasta la fecha de corte elegida (`to`): si el corte
// es hoy o futuro se usa el contador vigente de `batteries.cycles` (exacto); si es
// una fecha pasada real, se reconstruye desde `battery_logs.cycle_number` (dato real
// y fechado) — sin registros previos a esa fecha se reporta 0 (sin uso conocido).
// Salud y Estado no tienen historial fecha por fecha en el esquema (son campos
// vigentes, no eventos), así que siempre reflejan el valor actual de `batteries`.
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const to = searchParams.get('to');
        const todayISO = new Date().toISOString().split('T')[0];
        const isHistoricalCutoff = !!to && to < todayISO;

        const supabase = await createClientSSR();
        const ctx = await getOrgContext(supabase);
        if (!ctx.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        const prof = { organization_id: ctx.orgId, role: ctx.role };
        if (!ctx.role || !PERMISSIONS.canViewAudit.includes(ctx.role)) return NextResponse.json({ error: 'Sin permisos para ver reportes' }, { status: 403 });

        const { data: batteries, error } = await supabase
            .from('batteries')
            .select('serial_number, brand, model, cycles, health_status, status')
            .eq('organization_id', prof.organization_id)
            .order('serial_number', { ascending: true });
        if (error) throw error;

        let logsQuery = supabase
            .from('battery_logs')
            .select('battery_sn, cycle_number, created_at, aircraft:aircraft_id(model, serial_number)')
            .eq('organization_id', prof.organization_id)
            .order('created_at', { ascending: false });
        if (isHistoricalCutoff) logsQuery = logsQuery.lte('created_at', `${to}T23:59:59.999`);
        const { data: logs, error: logsErr } = await logsQuery;
        if (logsErr) throw logsErr;

        const cyclesAsOf = {};
        const lastAircraft = {};
        for (const log of logs || []) {
            if (!log.battery_sn) continue;
            const c = Number(log.cycle_number || 0);
            if (cyclesAsOf[log.battery_sn] == null || c > cyclesAsOf[log.battery_sn]) cyclesAsOf[log.battery_sn] = c;
            // logs vienen ordenados desc por fecha — el primero visto por serial es el más reciente
            if (lastAircraft[log.battery_sn] == null && log.aircraft) {
                lastAircraft[log.battery_sn] = log.aircraft.model || log.aircraft.serial_number || null;
            }
        }

        const rows = (batteries || []).map(b => ({
            serial_number: b.serial_number,
            brand: b.brand,
            cycles_as_of: isHistoricalCutoff ? (cyclesAsOf[b.serial_number] ?? 0) : Number(b.cycles || 0),
            last_aircraft: lastAircraft[b.serial_number] || null,
            health_status: b.health_status,
            status: b.status,
        }));

        return NextResponse.json(rows);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
