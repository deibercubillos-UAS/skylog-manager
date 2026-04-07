import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data } = await supabase.from('inventory_items').select('*').eq('owner_id', user.id);
        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const body = await request.json();

        // Si es una creación de artículo nuevo para el catálogo
        if (body.action === 'add_item') {
            const { data, error } = await supabase.from('inventory_items').insert([{
                owner_id: user.id,
                name: body.name
            }]).select();
            if (error) throw error;
            return NextResponse.json(data[0]);
        }

        // Si es un registro de inventario para una misión
        const { data, error } = await supabase.from('mission_inventory_logs').insert([{
            owner_id: user.id,
            flight_id: body.flight_id,
            items_json: body.items,
            notes: body.notes
        }]).select();

        if (error) throw error;
        return NextResponse.json(data[0]);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}