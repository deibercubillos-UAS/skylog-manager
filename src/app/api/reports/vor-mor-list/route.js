import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Listado de reportes MOR y VOR en el periodo — vor_mor_submissions,
// columnas tipo/fecha/severidad/estado/asignado. Para el reporte
// descargable en /dashboard/reports (distinto del tablero consolidado de
// Acciones Correctivas, que solo lista casos abiertos de 3 fuentes).
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canViewAudit.includes(role)) return NextResponse.json({ error: 'Sin permisos para ver reportes' }, { status: 403 });

        let query = supabase
            .from('vor_mor_submissions')
            .select('type, occurrence_date, reporter_name, is_anonymous, severity, reported_severity, status, assigned_to')
            .eq('organization_id', orgId)
            .order('occurrence_date', { ascending: true });
        if (from) query = query.gte('occurrence_date', from);
        if (to) query = query.lte('occurrence_date', to);

        const { data: submissions, error } = await query;
        if (error) throw error;

        const assigneeIds = [...new Set((submissions || []).map(s => s.assigned_to).filter(Boolean))];
        const { data: assignees } = assigneeIds.length
            ? await supabase.from('profiles').select('id, full_name').in('id', assigneeIds)
            : { data: [] };
        const nameById = {};
        (assignees || []).forEach(a => { nameById[a.id] = a.full_name; });

        const rows = (submissions || []).map(s => ({
            type: s.type,
            occurrence_date: s.occurrence_date,
            reporter: s.is_anonymous ? 'Anónimo' : (s.reporter_name || '—'),
            severity: s.severity,
            reported_severity: s.reported_severity,
            status: s.status,
            assigned_to: s.assigned_to ? (nameById[s.assigned_to] || '—') : '—',
        }));

        return NextResponse.json(rows);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
