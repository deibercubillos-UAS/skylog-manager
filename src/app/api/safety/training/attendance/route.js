import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// POST /api/safety/training/attendance — marca la asistencia de una persona
// a una ocurrencia (fecha) de una sesión del cronograma
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
        if (!body.session_id || !body.profile_id) {
            return NextResponse.json({ error: 'session_id y profile_id son requeridos' }, { status: 400 });
        }
        if (!DATE_REGEX.test(body.attended_date || '')) {
            return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
        }

        // Ambos deben pertenecer a la org — nunca confiar en los ids del cliente.
        // Membresía real vía organization_members (no profiles.organization_id,
        // que solo refleja la org ACTIVA de la cuenta).
        const [{ data: session }, { data: profile }] = await Promise.all([
            supabase.from('sms_training_sessions').select('id').eq('id', body.session_id).eq('organization_id', orgId).maybeSingle(),
            supabase.from('organization_members').select('id').eq('user_id', body.profile_id).eq('organization_id', orgId).maybeSingle(),
        ]);
        if (!session) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
        if (!profile) return NextResponse.json({ error: 'Persona no encontrada en la organización' }, { status: 404 });

        const { data, error } = await supabase
            .from('sms_training_attendance')
            .upsert({
                organization_id: orgId,
                session_id: body.session_id,
                profile_id: body.profile_id,
                attended_date: body.attended_date,
                created_by: user.id,
            }, { onConflict: 'session_id,profile_id,attended_date' })
            .select('*, profile:profile_id(full_name, email, role)')
            .single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
