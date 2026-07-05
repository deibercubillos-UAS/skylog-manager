import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// PATCH /api/safety/gap/questions/[id]/visibility — oculta/muestra una
// pregunta (oficial o propia) SOLO para la organización del usuario, sin
// tocar el catálogo global — así otra organización nunca se ve afectada por
// lo que esta organización decide ocultar.
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

        const body = await request.json();
        if (typeof body.hidden !== 'boolean') {
            return NextResponse.json({ error: 'hidden (boolean) es requerido' }, { status: 400 });
        }

        // La pregunta debe ser oficial (visible a todos) o de esta misma org —
        // nunca ocultar una pregunta ajena de otra organización.
        const { data: question } = await supabase
            .from('sms_gap_questions')
            .select('id, organization_id')
            .eq('id', id)
            .maybeSingle();
        if (!question || (question.organization_id && question.organization_id !== orgId)) {
            return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 });
        }

        const { data, error } = await supabase
            .from('sms_gap_question_visibility')
            .upsert({ organization_id: orgId, question_id: id, hidden: body.hidden }, { onConflict: 'organization_id,question_id' })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
