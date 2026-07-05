import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { occurrencesInRange, RECURRENCE_LABELS } from '@/lib/trainingCompliance';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Cronograma de Capacitación SMS (todo el personal, sin distinción de tipo
// operaciones/mantenimiento) — proyecta cada sesión recurrente a sus fechas
// reales de ocurrencia dentro del rango pedido. Mismo cálculo de cadencia
// (occurrencesInRange) que ya usa el reporte de Cronograma de Capacitación
// de pilotos — sms_training_sessions comparte la misma forma de recurrencia.
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        if (!DATE_REGEX.test(from || '') || !DATE_REGEX.test(to || '')) {
            return NextResponse.json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' }, { status: 400 });
        }

        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canViewAudit.includes(role)) return NextResponse.json({ error: 'Sin permisos para ver reportes' }, { status: 403 });

        const { data: sessions, error } = await supabase
            .from('sms_training_sessions')
            .select('topic, recurrence, recurrence_days, start_date, notes')
            .eq('organization_id', orgId)
            .order('topic');
        if (error) throw error;

        const rows = (sessions || []).flatMap(s =>
            occurrencesInRange(s, from, to).map(date => ({
                date,
                topic: s.topic,
                recurrence: RECURRENCE_LABELS[s.recurrence] || s.recurrence,
                notes: s.notes || '',
            }))
        ).sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json(rows);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
