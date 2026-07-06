import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Plan de Capacitación SMS — asistencia REAL registrada (sms_training_
// attendance) por sesión/fecha dentro del periodo, con % de cumplimiento
// del personal — a diferencia de "Cronograma Capacitación SMS" (F-SMS-012),
// que solo proyecta fechas futuras sin registrar quién asistió. Decisión
// confirmada con el usuario. Para el reporte descargable en
// /dashboard/reports.
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

        const { data: sessions, error: sErr } = await supabase
            .from('sms_training_sessions')
            .select('id, topic')
            .eq('organization_id', orgId);
        if (sErr) throw sErr;
        const topicBySession = {};
        (sessions || []).forEach(s => { topicBySession[s.id] = s.topic; });

        let attQuery = supabase
            .from('sms_training_attendance')
            .select('session_id, profile_id, attended_date')
            .eq('organization_id', orgId)
            .order('attended_date', { ascending: true });
        if (from) attQuery = attQuery.gte('attended_date', from);
        if (to) attQuery = attQuery.lte('attended_date', to);
        const { data: attendance, error: aErr } = await attQuery;
        if (aErr) throw aErr;

        // Regla de conteo: service role + .select('id') + .length.
        // organization_members es la fuente real de membresía (no profiles).
        const adminSupabase = createAdminClient();
        const { data: members } = await adminSupabase.from('organization_members').select('id').eq('organization_id', orgId);
        const total = (members || []).length;

        const bySessionDate = {};
        (attendance || []).forEach(a => {
            const key = `${a.session_id}__${a.attended_date}`;
            (bySessionDate[key] ||= new Set()).add(a.profile_id);
        });

        const rows = Object.entries(bySessionDate).map(([key, profiles]) => {
            const [sessionId, attendedDate] = key.split('__');
            const attended = profiles.size;
            return {
                topic: topicBySession[sessionId] || 'Sesión eliminada',
                attended_date: attendedDate,
                attended,
                total,
                pct: total ? Math.round((attended / total) * 100) : null,
            };
        }).sort((a, b) => a.attended_date.localeCompare(b.attended_date));

        return NextResponse.json(rows);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
