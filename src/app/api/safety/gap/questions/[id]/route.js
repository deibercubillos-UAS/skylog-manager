import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_FIELDS = ['element_number', 'element_name', 'question_text'];

// PATCH /api/safety/gap/questions/[id] — edita una pregunta personalizada de
// la organización. Las preguntas oficiales (organization_id null) no se
// pueden editar desde aquí — el filtro .eq('organization_id', orgId) ya las
// excluye (una oficial nunca calza con orgId), así que un intento sobre una
// oficial simplemente no encuentra fila y responde 404.
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
        const cleanData = {};
        for (const f of ALLOWED_FIELDS) {
            if (body[f] === undefined) continue;
            if (f === 'question_text' && !body.question_text?.trim()) {
                return NextResponse.json({ error: 'El texto de la pregunta es obligatorio' }, { status: 400 });
            }
            cleanData[f] = typeof body[f] === 'string' ? body[f].trim() : body[f];
        }

        const { data, error } = await supabase
            .from('sms_gap_questions')
            .update(cleanData)
            .eq('id', id)
            .eq('organization_id', orgId)
            .select()
            .single();

        if (error) throw error;
        if (!data) return NextResponse.json({ error: 'Pregunta no encontrada (¿es del catálogo oficial?)' }, { status: 404 });
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE /api/safety/gap/questions/[id] — elimina una pregunta personalizada
// de la organización (las respuestas ya guardadas para esa pregunta se
// borran en cascada). Igual que en PATCH, las oficiales quedan protegidas
// por el filtro de organization_id.
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
            .from('sms_gap_questions')
            .delete()
            .eq('id', id)
            .eq('organization_id', orgId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
