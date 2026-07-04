import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { logCaseEvent } from '@/lib/smsCase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/safety/case/actions — todas las acciones correctivas de casos
// SMS/VOR/MOR de la org (para el tablero consolidado de Acciones
// Correctivas, Fase 5 — ver docs/plan-mejora-sms-bitafly.md)
export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { user, orgId } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });

        const { data, error } = await supabase
            .from('sms_case_actions')
            .select('*, sms_report:sms_report_id(narrative), vor_mor:vor_mor_id(description, type)')
            .eq('organization_id', orgId)
            .order('due_date', { ascending: true, nullsFirst: false });

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

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

        // Verificar que el caso referenciado pertenece a la org — nunca confiar
        // en el id que manda el cliente (mismo patrón que /api/safety/case/notify)
        const caseTable = source === 'sms' ? 'sms_reports' : 'vor_mor_submissions';
        const { data: existing } = await supabase
            .from(caseTable)
            .select('id')
            .eq('id', id)
            .eq('organization_id', orgId)
            .maybeSingle();
        if (!existing) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });

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
