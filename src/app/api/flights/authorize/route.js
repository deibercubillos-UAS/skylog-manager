import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { orgId } = await getOrgContext(supabase);
        if (!orgId) return NextResponse.json([], { status: 401 });

        const { data, error } = await supabase
            .from('flight_authorizations')
            .select(`
                id,mission_id,scheduled_at,location,mission_type,status,created_at,
                pilot_id,aircraft_id,organization_id,
                pilots:pilot_id(name, phone, id_number),
                aircraft:aircraft_id(model, serial_number, total_hours),
                payload:payload_id(brand, model, category, serial_number),
                observer:observer_id(name)
            `)
            .eq('organization_id', orgId)
            .neq('status', 'realizado')
            .neq('status', 'cancelado')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) { return NextResponse.json([], { status: 500 }); }
}

export async function POST(request) {
    try {
        const supabase = await createClientSSR();
        const { user, orgId } = await getOrgContext(supabase);
        if (!orgId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        // Prefijo de la organización + próximo número de misión en paralelo
        const [orgRes, lastRes] = await Promise.all([
            supabase.from('organizations').select('flight_prefix').eq('id', orgId).single(),
            supabase.from('flight_authorizations')
                .select('mission_id')
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()
        ]);

        const body = await request.json();
        const prefix = orgRes.data?.flight_prefix || 'BIT';

        let nextNumber = 1;
        if (lastRes.data?.mission_id) {
            const parts = lastRes.data.mission_id.split('-');
            const lastNumber = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
        }

        const missionId = `${prefix}-${nextNumber.toString().padStart(3, '0')}`;

        const { data, error } = await supabase.from('flight_authorizations').insert([{
            ...body,
            mission_id: missionId,
            organization_id: orgId,
            scheduled_by: user.id,
            status: 'autorizado'
        }]).select();

        if (error) throw error;
        return NextResponse.json(data[0]);
    } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}

// --- MÉTODO NUEVO PARA EDITAR ---
export async function PATCH(request) {
    try {
        const supabase = await createClientSSR();
        const { orgId } = await getOrgContext(supabase);
        if (!orgId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const body = await request.json();
        const { id, pilot_id, aircraft_id, location, scheduled_at, mission_type } = body;

        // Verificamos que la autorización pertenezca a la organización del usuario
        const { data: existing } = await supabase
            .from('flight_authorizations')
            .select('organization_id')
            .eq('id', id)
            .single();

        if (!existing || existing.organization_id !== orgId) {
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