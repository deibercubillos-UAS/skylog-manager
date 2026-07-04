import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const RECURRENCES = ['semanal', 'quincenal', 'mensual', 'personalizado'];

// GET /api/safety/training/sessions — cronograma de Capacitación del SMS de
// la org, con su roster de asistencia anidado
export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { user, orgId } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });

        const { data, error } = await supabase
            .from('sms_training_sessions')
            .select('*, attendance:sms_training_attendance(*, profile:profile_id(full_name, email, role))')
            .eq('organization_id', orgId)
            .order('topic');

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/safety/training/sessions — crea una sesión nueva del cronograma
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
        if (!body.topic?.trim()) return NextResponse.json({ error: 'El tema de la sesión es obligatorio' }, { status: 400 });
        if (!RECURRENCES.includes(body.recurrence)) return NextResponse.json({ error: 'Recurrencia inválida' }, { status: 400 });

        const { data, error } = await supabase
            .from('sms_training_sessions')
            .insert([{
                organization_id: orgId,
                topic: body.topic.trim(),
                recurrence: body.recurrence,
                recurrence_days: body.recurrence === 'personalizado' ? Number(body.recurrence_days) || 30 : null,
                start_date: body.start_date || new Date().toISOString().split('T')[0],
                notes: body.notes?.trim() || null,
                created_by: user.id,
            }])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
