import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { fmtDateMed } from '@/lib/formatters';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Tablero consolidado de Acciones Correctivas — snapshot server-side de las
// mismas 3 fuentes que agrega /dashboard/safety (tab "Acciones Correctivas",
// Fase 5): casos SMS/VOR/MOR, planes de acción de indicadores SPI, y
// hallazgos "No" de Mejora Continua (GAP). Sin tabla unificada nueva — se
// reconstruye aquí en solo lectura para el reporte descargable (Fase 8).
export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { user, orgId } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });

        const [{ data: caseActions, error: caseErr }, { data: indicators, error: indErr }, { data: assessments, error: gapErr }] = await Promise.all([
            supabase.from('sms_case_actions')
                .select('label, owner, due_date, done, sms_report:sms_report_id(narrative), vor_mor:vor_mor_id(description, type)')
                .eq('organization_id', orgId),
            supabase.from('safety_indicators')
                .select('name, actions:safety_indicator_actions(action_plan, status, execution_days, created_at)')
                .eq('organization_id', orgId),
            supabase.from('sms_gap_assessments')
                .select(`
                    title, assessment_date,
                    responses:sms_gap_responses(response, evidence_date, responsible, status, question:question_id(question_text))
                `)
                .eq('organization_id', orgId),
        ]);
        if (caseErr) throw caseErr;
        if (indErr) throw indErr;
        if (gapErr) throw gapErr;

        const rows = [];

        (caseActions || []).forEach(a => {
            const isSms = !!a.sms_report;
            rows.push({
                source: isSms ? 'SMS' : (a.vor_mor?.type || 'VOR/MOR'),
                title: a.label,
                context: a.sms_report?.narrative || a.vor_mor?.description || '',
                responsible: a.owner || '',
                due_date: a.due_date,
                status: a.done ? 'Completado' : 'Pendiente',
            });
        });

        (indicators || []).forEach(ind => {
            (ind.actions || []).forEach(act => {
                let estDue = null;
                if (act.execution_days) {
                    const base = new Date(act.created_at);
                    base.setDate(base.getDate() + Number(act.execution_days));
                    estDue = base.toISOString().split('T')[0];
                }
                rows.push({
                    source: 'SPI',
                    title: act.action_plan,
                    context: ind.name,
                    responsible: '',
                    due_date: estDue,
                    status: act.status === 'completado' ? 'Completado' : act.status === 'en_progreso' ? 'En progreso' : 'Pendiente',
                });
            });
        });

        (assessments || []).forEach(assess => {
            (assess.responses || []).filter(r => r.response === 'no').forEach(r => {
                rows.push({
                    source: 'GAP',
                    title: r.question?.question_text || 'Hallazgo GAP',
                    context: assess.title || `Autoevaluación ${fmtDateMed(assess.assessment_date)}`,
                    responsible: r.responsible || '',
                    due_date: r.evidence_date,
                    status: r.status === 'completado' ? 'Completado' : r.status === 'en_progreso' ? 'En progreso' : 'Pendiente',
                });
            });
        });

        rows.sort((a, b) => {
            if (!a.due_date && !b.due_date) return 0;
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return a.due_date.localeCompare(b.due_date);
        });

        return NextResponse.json(rows);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
