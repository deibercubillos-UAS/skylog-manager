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

        // 1. Obtener org_id del usuario ANTES de borrarlo (una sola query — evita double-fetch bug)
        const { data: prof } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        const orgId = prof?.organization_id ?? null;

        // 2. Contar miembros de la org (solo si tiene org)
        let isLastMember = false;
        if (orgId) {
            const { count } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('organization_id', orgId);
            isLastMember = count === 1;
        }

        // 3. Eliminar usuario de auth.users PRIMERO (cascade elimina profiles por FK).
        //    Si esto falla, la org sigue intacta — sin estado corrupto.
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
        if (deleteError) throw deleteError;

        // 4. Si era el único miembro, eliminar la organización (cascade borra flota, vuelos, etc.)
        //    El usuario ya fue eliminado — su JWT es inválido. Operación segura.
        if (isLastMember && orgId) {
            await adminClient.from('organizations').delete().eq('id', orgId);
        }

        return NextResponse.json({ message: 'Cuenta eliminada correctamente' });
    } catch (err) {
        console.error('Error al eliminar cuenta:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
