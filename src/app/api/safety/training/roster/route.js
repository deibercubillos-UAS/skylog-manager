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

        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, role')
            .eq('organization_id', orgId)
            .order('full_name');

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
