import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'superadmin') {
            return NextResponse.json({ error: "Acceso denegado: Se requiere superadmin" }, { status: 403 });
        }

        // Intento de obtención de datos sin ordenamiento estricto para evitar errores de columna
        const { data, error } = await supabase
            .from('profiles')
            .select('*');

        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (err) {
        console.error("Error Master API:", err.message);
        return NextResponse.json({ error: "Falla en base de datos: " + err.message }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const { targetUserId, updateData } = body;
        
        const { data, error } = await supabase
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
