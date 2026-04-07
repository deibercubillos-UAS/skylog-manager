import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

        const { data, error } = await supabase
            .from('form_settings')
            .select('*')
            .eq('owner_id', user.id)
            .maybeSingle();

        return NextResponse.json(data || { enabled_forms: [], custom_options: { op_types: [], inventory: [] } });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const body = await request.json();
        
        const { data, error } = await supabase.from('form_settings').upsert({
            owner_id: user.id,
            enabled_forms: body.enabled_forms || [],
            custom_options: body.custom_options || { op_types: [], inventory: [] },
            updated_at: new Date().toISOString()
        }).select();

        if (error) throw error;
        return NextResponse.json(data[0]);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
