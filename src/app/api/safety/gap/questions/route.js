import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CUSTOM_COMPONENT = { number: 5, name: 'Preguntas personalizadas de la organización' };

// GET /api/safety/gap/questions — catálogo global (fijo, transcripción
// literal del Apéndice 1 - MAUT-5.0-22-017) más las preguntas propias que la
// organización haya agregado. Por defecto excluye las que la org ocultó
// (?includeHidden=1 las incluye, para el panel de configuración del catálogo).
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const includeHidden = searchParams.get('includeHidden') === '1';

        const supabase = await createClientSSR();
        const { user, orgId } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });

        const [{ data: questions, error }, { data: visibility, error: vErr }] = await Promise.all([
            supabase.from('sms_gap_questions').select('*').order('order_index'),
            supabase.from('sms_gap_question_visibility').select('question_id, hidden').eq('organization_id', orgId),
        ]);
        if (error) throw error;
        if (vErr) throw vErr;

        const hiddenSet = new Set((visibility || []).filter(v => v.hidden).map(v => v.question_id));
        let rows = (questions || []).map(q => ({
            ...q,
            is_custom: !!q.organization_id,
            hidden: hiddenSet.has(q.id),
        }));
        if (!includeHidden) rows = rows.filter(q => !q.hidden);

        return NextResponse.json(rows);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/safety/gap/questions — agrega una pregunta personalizada de la
// organización al catálogo (componente 5, "Preguntas personalizadas") — el
// catálogo oficial de 100 preguntas (componentes 1-4) nunca se toca aquí.
export async function POST(request) {
    try {
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSMS.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const body = await request.json();
        if (!body.question_text?.trim()) {
            return NextResponse.json({ error: 'El texto de la pregunta es obligatorio' }, { status: 400 });
        }

        const { data: maxRow } = await supabase
            .from('sms_gap_questions')
            .select('order_index')
            .order('order_index', { ascending: false })
            .limit(1)
            .maybeSingle();
        const nextOrderIndex = (maxRow?.order_index || 0) + 1;

        const { data, error } = await supabase
            .from('sms_gap_questions')
            .insert([{
                organization_id: orgId,
                component_number: CUSTOM_COMPONENT.number,
                component_name: CUSTOM_COMPONENT.name,
                element_number: body.element_number?.trim() || '5.1',
                element_name: body.element_name?.trim() || 'General',
                question_text: body.question_text.trim(),
                order_index: nextOrderIndex,
                created_by: user.id,
            }])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ ...data, is_custom: true, hidden: false }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
