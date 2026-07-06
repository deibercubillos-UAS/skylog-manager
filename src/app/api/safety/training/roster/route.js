import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/safety/training/roster — todo el personal de la org (no solo
// pilotos) para marcar asistencia a Capacitación del SMS. No reutiliza
// /api/admin/users porque ese endpoint solo permite superadmin/admin —
// gerente_sms (canManageSMS) también debe poder marcar asistencia.
export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSMS.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        // Roster real de la org — organization_members (rol) + identidad desde
        // profiles (no profiles.organization_id, que solo refleja la org activa).
        const { data: memberRows, error } = await supabase
            .from('organization_members')
            .select('user_id, role')
            .eq('organization_id', orgId);
        if (error) throw error;

        const roleByUser = new Map((memberRows || []).map(m => [m.user_id, m.role]));
        const memberIds = [...roleByUser.keys()];
        if (!memberIds.length) return NextResponse.json([]);

        const { data: identities, error: idErr } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', memberIds)
            .order('full_name');
        if (idErr) throw idErr;

        const data = (identities || []).map(p => ({ ...p, role: roleByUser.get(p.id) }));
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
