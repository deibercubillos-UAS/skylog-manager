import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { logCaseEvent } from '@/lib/smsCase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/safety/case/notify — marca un caso MOR como notificado a AeroCivil
export async function POST(request) {
    try {
        const supabase = await createClientSSR();
        const { user, orgId, role, fullName } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSMS.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const { id } = await request.json();
        if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 });

        const { data: existing } = await supabase
            .from('vor_mor_submissions')
            .select('id, type')
            .eq('id', id)
            .eq('organization_id', orgId)
            .single();
        if (!existing) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });
        if (existing.type !== 'MOR') {
            return NextResponse.json({ error: 'Solo los reportes MOR requieren notificación a AeroCivil' }, { status: 400 });
        }

        const notifiedAt = new Date().toISOString();
        const { error } = await supabase
            .from('vor_mor_submissions')
            .update({ aerocivil_notified_at: notifiedAt })
            .eq('id', id)
            .eq('organization_id', orgId);
        if (error) throw error;

        await logCaseEvent({
            orgId,
            vorMorId: id,
            label: 'Notificado a AeroCivil',
            actorId: user.id,
            actorName: fullName || user.email,
        });

        return NextResponse.json({ success: true, aerocivil_notified_at: notifiedAt });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
