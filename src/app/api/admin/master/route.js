import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "No user" }, { status: 401 });

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'superadmin') return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        // El SuperAdmin ve todos los perfiles sin filtros
        const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(request) {
    const supabase = await createClient();
    const body = await request.json();
    const { targetUserId, updateData } = body;
    const { data, error } = await supabase.from('profiles').update(updateData).eq('id', targetUserId).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data[0]);
}
