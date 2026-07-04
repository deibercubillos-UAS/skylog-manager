import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const RESPONSES = ['si', 'no'];
const STATUSES = ['pendiente', 'en_progreso', 'completado'];

// PATCH /api/safety/gap/assessments/[id] — guarda la evaluación completa de
// una sola vez: metadatos (title/assessment_date) + todas las respuestas
// cambiadas, mismo patrón que /api/safety/risk-config (un solo mecanismo de
// guardado para carga inicial y ediciones posteriores).
// Body: { title?, assessment_date?, responses: [{question_id, response, evidence_date, comments, responsible, status}] }
export async function PATCH(request, { params }) {
    try {
        const { id } = await params;
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSMS.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const { data: assessment } = await supabase
            .from('sms_gap_assessments').select('id').eq('id', id).eq('organization_id', orgId).maybeSingle();
        if (!assessment) return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 });

        const body = await request.json();

        const metaUpdate = {};
        if (body.title !== undefined) metaUpdate.title = body.title?.trim() || null;
        if (body.assessment_date !== undefined) metaUpdate.assessment_date = body.assessment_date;
        if (Object.keys(metaUpdate).length) {
            metaUpdate.updated_at = new Date().toISOString();
            const { error: metaErr } = await supabase.from('sms_gap_assessments').update(metaUpdate).eq('id', id);
            if (metaErr) throw metaErr;
        }

        const responses = Array.isArray(body.responses) ? body.responses : [];
        for (const r of responses) {
            if (r.response && !RESPONSES.includes(r.response)) {
                return NextResponse.json({ error: 'Respuesta inválida' }, { status: 400 });
            }
            if (r.status && !STATUSES.includes(r.status)) {
                return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
            }
        }

        if (responses.length) {
            const rows = responses.map(r => ({
                organization_id: orgId,
                assessment_id: id,
                question_id: r.question_id,
                response: r.response || null,
                evidence_date: r.evidence_date || null,
                comments: r.comments?.trim() || null,
                responsible: r.responsible?.trim() || null,
                status: r.status || 'pendiente',
                updated_at: new Date().toISOString(),
            }));
            const { error } = await supabase
                .from('sms_gap_responses')
                .upsert(rows, { onConflict: 'assessment_id,question_id' });
            if (error) throw error;
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE /api/safety/gap/assessments/[id]
export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSMS.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const { error } = await supabase
            .from('sms_gap_assessments')
            .delete()
            .eq('id', id)
            .eq('organization_id', orgId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
