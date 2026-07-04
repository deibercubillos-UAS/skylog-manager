import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const RECURRENCES = ['semanal', 'quincenal', 'mensual', 'personalizado'];
const ALLOWED_FIELDS = ['topic', 'recurrence', 'recurrence_days', 'start_date', 'notes'];

// PATCH /api/safety/training/sessions/[id] — edita una sesión del cronograma
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
        if (body.recurrence !== undefined && !RECURRENCES.includes(body.recurrence)) {
            return NextResponse.json({ error: 'Recurrencia inválida' }, { status: 400 });
        }

        const cleanData = {};
        for (const f of ALLOWED_FIELDS) {
            if (body[f] === undefined) continue;
            if (f === 'topic') {
                if (!body.topic?.trim()) return NextResponse.json({ error: 'El tema de la sesión es obligatorio' }, { status: 400 });
                cleanData.topic = body.topic.trim();
            } else if (f === 'notes') {
                cleanData.notes = body.notes?.trim() || null;
            } else if (f === 'recurrence_days') {
                cleanData.recurrence_days = body.recurrence_days ? Number(body.recurrence_days) : null;
            } else {
                cleanData[f] = body[f];
            }
        }
        cleanData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('sms_training_sessions')
            .update(cleanData)
            .eq('id', id)
            .eq('organization_id', orgId)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE /api/safety/training/sessions/[id]
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
            .from('sms_training_sessions')
            .delete()
            .eq('id', id)
            .eq('organization_id', orgId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
