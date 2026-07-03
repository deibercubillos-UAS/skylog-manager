import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { logCaseEvent } from '@/lib/smsCase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SMS_STATUSES = ['abierto', 'en_analisis', 'cerrado'];
const VORMOR_STATUSES = ['recibido', 'en_investigacion', 'cerrado', 'archivado'];

// GET /api/safety/case?source=sms|vormor&id=<uuid> — detalle del caso + acciones + línea de tiempo
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const source = searchParams.get('source');
        const id = searchParams.get('id');
        if (!['sms', 'vormor'].includes(source) || !id) {
            return NextResponse.json({ error: 'source e id son requeridos' }, { status: 400 });
        }

        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSMS.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const table = source === 'sms' ? 'sms_reports' : 'vor_mor_submissions';
        const linkCol = source === 'sms' ? 'sms_report_id' : 'vor_mor_id';
        const selectCols = source === 'sms' ? '*,owner:owner_id(full_name)' : '*';

        const { data: report, error: repErr } = await supabase
            .from(table)
            .select(selectCols)
            .eq('id', id)
            .eq('organization_id', orgId)
            .single();
        if (repErr || !report) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });

        const [actionsRes, eventsRes] = await Promise.all([
            supabase.from('sms_case_actions').select('*').eq(linkCol, id).order('created_at', { ascending: true }),
            supabase.from('sms_case_events').select('*').eq(linkCol, id).order('created_at', { ascending: true }),
        ]);

        return NextResponse.json({
            source,
            report,
            actions: actionsRes.data || [],
            events: eventsRes.data || [],
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PATCH /api/safety/case — actualiza el estado del caso, registra el evento en la línea de tiempo
export async function PATCH(request) {
    try {
        const supabase = await createClientSSR();
        const { user, orgId, role, fullName } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSMS.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const body = await request.json();
        const { source, id, status } = body;
        if (!['sms', 'vormor'].includes(source) || !id || !status) {
            return NextResponse.json({ error: 'source, id y status son requeridos' }, { status: 400 });
        }
        const validStatuses = source === 'sms' ? SMS_STATUSES : VORMOR_STATUSES;
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
        }

        const table = source === 'sms' ? 'sms_reports' : 'vor_mor_submissions';
        const { data: existing } = await supabase
            .from(table)
            .select('id, status')
            .eq('id', id)
            .eq('organization_id', orgId)
            .maybeSingle();
        if (!existing) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });

        const { error: updErr } = await supabase
            .from(table)
            .update({ status })
            .eq('id', id)
            .eq('organization_id', orgId);
        if (updErr) throw updErr;

        // La línea de tiempo solo registra cambios reales — re-guardar el mismo
        // estado no genera evento (mismo criterio que PATCH /api/vor-mor/[id])
        if (status !== existing.status) {
            await logCaseEvent({
                orgId,
                smsReportId: source === 'sms' ? id : undefined,
                vorMorId:    source === 'vormor' ? id : undefined,
                label: `Estado actualizado a "${status}"`,
                actorId: user.id,
                actorName: fullName || user.email,
            });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
