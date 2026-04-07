import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const body = await request.json();

    const { data, error } = await supabase.from('form_templates').insert([{
        owner_id: user.id,
        name: body.name,
        form_code: body.form_code,
        version: body.version,
        schema: body.schema,
        updated_at: new Date().toISOString()
    }]).select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data[0]);
}

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('form_templates').select('*').eq('owner_id', user.id);
    return NextResponse.json(data);
}
