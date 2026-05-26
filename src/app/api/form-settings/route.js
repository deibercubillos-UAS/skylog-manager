import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data } = await supabase
        .from('form_settings')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

    return NextResponse.json(data || { enabled_forms: [], form_metadata: {} });
}

export async function POST(request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();

    const { data, error } = await supabase.from('form_settings').upsert({
        owner_id:      user.id,
        enabled_forms: body.enabled_forms,
        form_metadata: body.form_metadata,
        updated_at:    new Date().toISOString(),
    }).select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data[0]);
}
