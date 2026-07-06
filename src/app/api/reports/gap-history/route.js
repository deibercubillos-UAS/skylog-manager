import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Mejora Continua — comparativo histórico entre TODAS las autoevaluaciones
// GAP realizadas (evolución del % de cumplimiento en el tiempo, por
// componente y total), a diferencia de "Autoevaluación GAP del SMS"
// (F-SMS-011) que solo imprime la última — decisión confirmada con el
// usuario. Para el reporte descargable en /dashboard/reports.
export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canViewAudit.includes(role)) return NextResponse.json({ error: 'Sin permisos para ver reportes' }, { status: 403 });

        const { data: assessments, error: aErr } = await supabase
            .from('sms_gap_assessments')
            .select('id, title, assessment_date')
            .eq('organization_id', orgId)
            .order('assessment_date', { ascending: true });
        if (aErr) throw aErr;

        if (!assessments?.length) return NextResponse.json({ components: [], rows: [] });

        // Catálogo (global + propio de la org, mismo criterio sin filtro
        // explícito que ya usa GET /api/safety/gap/questions — RLS resuelve
        // qué preguntas custom son visibles para esta org).
        const [{ data: questions, error: qErr }, { data: responses, error: rErr }] = await Promise.all([
            supabase.from('sms_gap_questions').select('id, component_number'),
            supabase.from('sms_gap_responses')
                .select('assessment_id, question_id, response')
                .in('assessment_id', assessments.map(a => a.id)),
        ]);
        if (qErr) throw qErr;
        if (rErr) throw rErr;

        const componentByQuestion = {};
        (questions || []).forEach(q => { componentByQuestion[q.id] = q.component_number; });
        const components = [...new Set((questions || []).map(q => q.component_number))].sort((a, b) => a - b);

        const responsesByAssessment = {};
        (responses || []).forEach(r => {
            (responsesByAssessment[r.assessment_id] ||= []).push(r);
        });

        const pctOf = (list) => {
            const answered = list.filter(r => r.response === 'si' || r.response === 'no');
            if (!answered.length) return null;
            const si = answered.filter(r => r.response === 'si').length;
            return Math.round((si / answered.length) * 100);
        };

        let prevTotal = null;
        const rows = assessments.map(a => {
            const list = responsesByAssessment[a.id] || [];
            const perComponent = {};
            components.forEach(c => {
                perComponent[c] = pctOf(list.filter(r => componentByQuestion[r.question_id] === c));
            });
            const total = pctOf(list);
            const delta = (total !== null && prevTotal !== null) ? total - prevTotal : null;
            prevTotal = total !== null ? total : prevTotal;
            return {
                title: a.title,
                assessment_date: a.assessment_date,
                perComponent,
                total,
                delta,
            };
        });

        return NextResponse.json({ components, rows });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
