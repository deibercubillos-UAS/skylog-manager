import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { occurrencesInRange, RECURRENCE_LABELS } from '@/lib/trainingCompliance';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Cronograma de sesiones de Capacitación (Operaciones o Mantenimiento) —
// proyecta cada sesión recurrente a sus fechas reales de ocurrencia dentro del
// rango pedido (mismo cálculo de cadencia que el cumplimiento del examen, ver
// lib/trainingCompliance.js), para el reporte descargable en /dashboard/reports.
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        if (!['operaciones', 'mantenimiento'].includes(type)) {
            return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
        }
        if (!DATE_REGEX.test(from || '') || !DATE_REGEX.test(to || '')) {
            return NextResponse.json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' }, { status: 400 });
        }

        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canViewAudit.includes(role)) return NextResponse.json({ error: 'Sin permisos para ver reportes' }, { status: 403 });

        const { data: sessions, error } = await supabase
            .from('training_sessions')
            .select('topic, recurrence, recurrence_days, start_date, notes')
            .eq('organization_id', orgId)
            .eq('type', type)
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
