import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    
    if (profile?.role !== 'superadmin') return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    return NextResponse.json(data);
}

export async function PATCH(request) {
    const supabase = await createClient();
    const body = await request.json();
    const { targetUserId, updateData } = body;
    
    const { data, error } = await supabase.from('profiles').update(updateData).eq('id', targetUserId).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data[0]);
}
