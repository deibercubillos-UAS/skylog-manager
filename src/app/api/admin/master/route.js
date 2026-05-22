import { createAdminClient, createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClient();
        const adminSupabase = createAdminClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

        // Obtenemos el perfil con la Service Role Key (Bypass RLS)
        const { data: profile, error: profError } = await adminSupabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profError) throw new Error("Perfil no encontrado en la base de datos.");

        // LOG DE SEGURIDAD (Se ve en los logs de Vercel)
        console.log(`Intento de acceso Master - Usuario: ${user.email} - Rol: ${profile?.role}`);

        if (profile?.role !== 'superadmin') {
            return NextResponse.json({ 
                error: `Acceso Denegado. Su rol actual es: ${profile?.role}. Se requiere: superadmin` 
            }, { status: 403 });
        }

        const { data, error } = await adminSupabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const supabase = await createClient();
        const adminSupabase = createAdminClient();

        // Verificar sesión del llamante
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

        // Verificar que el llamante es superadmin (con service role para bypass RLS)
        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        console.log(`Intento de PATCH Master - Usuario: ${user.email} - Rol: ${profile?.role}`);

        if (profile?.role !== 'superadmin') {
            return NextResponse.json({
                error: `Acceso Denegado. Su rol actual es: ${profile?.role}. Se requiere: superadmin`
            }, { status: 403 });
        }

        const body = await request.json();
        const { targetUserId, updateData } = body;
        if (!targetUserId || !updateData) {
            return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
        }

        // Evitar que se auto-degraden o eliminen el propio rol superadmin
        if (targetUserId === user.id && updateData.role && updateData.role !== 'superadmin') {
            return NextResponse.json({ error: "No puedes cambiar tu propio rol de superadmin" }, { status: 403 });
        }

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
