import { createAdminClient, createClientSSR } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClientSSR();
        const adminSupabase = createAdminClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "No user" }, { status: 401 });

        // Verificamos el rol usando el cliente admin para evitar recursión RLS
        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'superadmin') {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        // El cliente Admin puede ver todo sin importar las políticas RLS
        const { data, error } = await adminSupabase
            .from('profiles')
            .select('*');

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const adminSupabase = createAdminClient();
        const body = await request.json();
        const { targetUserId, updateData } = body;
        
        const { data, error } = await adminSupabase
            .from('profiles')
            .update(updateData)
            .eq('id', targetUserId)
            .select();

        if (error) throw error;
        return NextResponse.json(data[0]);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}