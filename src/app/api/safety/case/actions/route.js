import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { logCaseEvent } from '@/lib/smsCase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/safety/case/actions — agrega una acción correctiva al caso
export async function POST(request) {
    try {
        const supabase = await createClientSSR();
        const { user, orgId, role, fullName } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSMS.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const body = await request.json();
        const { source, id, label, owner, due_date } = body;
        if (!['sms', 'vormor'].includes(source) || !id || !label?.trim()) {
            return NextResponse.json({ error: 'source, id y label son requeridos' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('sms_case_actions')
            .insert([{
                organization_id: orgId,
                sms_report_id: source === 'sms' ? id : null,
                vor_mor_id:    source === 'vormor' ? id : null,
                label:      label.trim(),
                owner:      owner?.trim() || null,
                due_date:   due_date || null,
                created_by: user.id,
            }])
            .select()
            .single();
        if (error) throw error;

        await logCaseEvent({
            orgId,
            smsReportId: source === 'sms' ? id : undefined,
            vorMorId:    source === 'vormor' ? id : undefined,
            label: `Acción correctiva agregada: "${label.trim()}"`,
            actorId: user.id,
            actorName: fullName || user.email,
        });

        return NextResponse.json(data, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PATCH /api/safety/case/actions — marca una acción como hecha/pendiente
export async function PATCH(request) {
    try {
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSMS.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const body = await request.json();
        const { actionId, done } = body;
        if (!actionId || typeof done !== 'boolean') {
            return NextResponse.json({ error: 'actionId y done son requeridos' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('sms_case_actions')
            .update({ done, done_at: done ? new Date().toISOString() : null })
            .eq('id', actionId)
            .eq('organization_id', orgId)
            .select()
            .single();
        if (error) throw error;

        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
