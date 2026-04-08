import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

        const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single();
        
        const rolesAutorizados = ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'];
        if (!rolesAutorizados.includes(profile.role)) {
            return NextResponse.json({ error: "Tu rol no permite programar misiones." }, { status: 403 });
        }

        const body = await request.json();
        
        // Inserción con todos los campos obligatorios
        const { data, error } = await supabase.from('flight_authorizations').insert([{
            pilot_id: body.pilot_id,
            aircraft_id: body.aircraft_id,
            location: body.location,
            scheduled_at: body.scheduled_at,
            mission_id: body.mission_id,
            organization_id: profile.organization_id,
            scheduled_by: user.id,
            status: 'autorizado'
        }]).select();

        if (error) {
            console.error("Error DB al autorizar:", error.message);
            return NextResponse.json({ error: "Error de Base de Datos: " + error.message }, { status: 500 });
        }

        return NextResponse.json(data[0]);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

        const { data, error } = await supabase
            .from('flight_authorizations')
            .select('*, pilots(name), aircraft(model)')
            .eq('organization_id', profile.organization_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
