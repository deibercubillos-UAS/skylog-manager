import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function DELETE() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // Requerimos la Service Role Key para eliminar al usuario de auth.users.
        // Esta clave NUNCA se expone al cliente — solo existe en el servidor.
        const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!adminKey) {
            return NextResponse.json(
                { error: 'Eliminación de cuenta no disponible en este entorno' },
                { status: 503 }
            );
        }

        const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            adminKey,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // 1. Eliminar datos de la organización solo si es el único miembro
        const { count } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', (
                await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
            ).data?.organization_id);

        // Si es el único miembro, eliminar la organización (cascade borra aeronaves, vuelos, etc.)
        if (count === 1) {
            const { data: prof } = await supabase
                .from('profiles').select('organization_id').eq('id', user.id).single();
            if (prof?.organization_id) {
                await adminClient.from('organizations').delete().eq('id', prof.organization_id);
            }
        }

        // 2. Eliminar el usuario de auth.users (cascade elimina profiles por FK)
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
        if (deleteError) throw deleteError;

        return NextResponse.json({ message: 'Cuenta eliminada correctamente' });
    } catch (err) {
        console.error('Error al eliminar cuenta:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
