import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Última autoevaluación GAP del SMS (Apéndice 1, 100 preguntas) — snapshot,
// sin rango de fechas. Trae las 100 preguntas del catálogo global con la
// respuesta de la evaluación (si existe) mezclada en JS, para que el reporte
// muestre el checklist completo aunque no todas las preguntas se hayan
// respondido todavía — igual al patrón de "computar, no fabricar" del resto
// de la app. Para el reporte descargable en /dashboard/reports (Fase 8).
export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { user, orgId } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });

        const { data: assessment, error: aErr } = await supabase
            .from('sms_gap_assessments')
            .select('id, title, assessment_date')
            .eq('organization_id', orgId)
            .order('assessment_date', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (aErr) throw aErr;

        if (!assessment) return NextResponse.json({ assessment: null, rows: [] });

        const [{ data: questions, error: qErr }, { data: responses, error: rErr }] = await Promise.all([
            supabase.from('sms_gap_questions')
                .select('id, component_number, component_name, element_number, element_name, question_text, order_index')
                .order('order_index'),
            supabase.from('sms_gap_responses')
                .select('question_id, response, evidence_date, comments, responsible, status')
                .eq('assessment_id', assessment.id),
        ]);
        if (qErr) throw qErr;
        if (rErr) throw rErr;

        const responseByQuestion = {};
        (responses || []).forEach(r => { responseByQuestion[r.question_id] = r; });

        const rows = (questions || []).map(q => ({
            ...q,
            response: responseByQuestion[q.id] || null,
        }));

        return NextResponse.json({ assessment, rows });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
