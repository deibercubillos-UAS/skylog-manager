import { createClientSSR } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

        const { data, error } = await supabase
            .from('flight_authorizations')
            .select(`
                *,
                pilots:pilot_id(name, phone, id_number),
                aircraft:aircraft_id(model, serial_number, total_hours),
                payload:payload_id(brand, model, category, serial_number),
                observer:observer_id(name)
            `)
            .eq('organization_id', prof.organization_id)
            .eq('status', 'autorizado')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) { return NextResponse.json([], { status: 500 }); }
}

export async function POST(request) {
    try {
        const supabase = await createClientSSR();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        const { data: org } = await supabase.from('organizations').select('flight_prefix').eq('id', prof.organization_id).single();

        const body = await request.json();
        const prefix = org.flight_prefix || 'BIT';

        // Buscamos el último mission_id por orden descendente (más seguro que contar filas)
        const { data: last } = await supabase.from('flight_authorizations')
            .select('mission_id')
            .eq('organization_id', prof.organization_id)
            .ilike('mission_id', `${prefix}-%`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        let nextNumber = 1;
        if (last?.mission_id) {
            const parts = last.mission_id.split('-');
            const lastNumber = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
        }

        const missionId = `${prefix}-${nextNumber.toString().padStart(3, '0')}`;

        const { data, error } = await supabase.from('flight_authorizations').insert([{
            ...body,
            mission_id: missionId,
            organization_id: prof.organization_id,
            scheduled_by: user.id,
            status: 'autorizado' // <--- DEBE SER EXACTAMENTE IGUAL AL FILTRO DE DESPACHO
        }]).select();

        if (error) throw error;
        return NextResponse.json(data[0]);
    } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}

// --- MÉTODO NUEVO PARA EDITAR ---
export async function PATCH(request) {
    try {
        const supabase = await createClientSSR();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        const body = await request.json();
        const { id, pilot_id, aircraft_id, location, scheduled_at, mission_type } = body;

        // Verificamos que la autorización pertenezca a la organización del usuario
        const { data: existing } = await supabase
            .from('flight_authorizations')
            .select('organization_id')
            .eq('id', id)
            .single();

        if (!existing || existing.organization_id !== prof.organization_id) {
            return NextResponse.json({ error: "No autorizado para editar esta misión" }, { status: 403 });
        }

        const { data, error } = await supabase
            .from('flight_authorizations')
            .update({
                pilot_id,
                aircraft_id,
                location,
                scheduled_at,
                mission_type,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        return NextResponse.json(data[0]);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}