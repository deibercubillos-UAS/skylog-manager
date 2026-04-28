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
            .select('id, full_name, email, role, subscription_plan, subscription_expires_at, last_payment_date, organization_id, company_name, admin_notes, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const adminSupabase = createAdminClient();
        const body = await request.json();
        const { targetUserId, updateData } = body;
        const { data, error } = await adminSupabase.from('profiles').update(updateData).eq('id', targetUserId).select();
        if (error) throw error;
        return NextResponse.json(data[0]);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
