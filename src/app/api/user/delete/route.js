import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getOrgContext } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function DELETE() {
    try {
        const supabase = await createClient();
        const ctx = await getOrgContext(supabase);
        const user = ctx.user;
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

        // 1. Org activa del usuario ANTES de borrarlo (ya resuelta por getOrgContext)
        const orgId = ctx.orgId;

        // 2. Contar miembros REALES de la org (organization_members, no profiles —
        // profiles solo refleja quién tiene esta org como ACTIVA ahora mismo; un
        // miembro que cambió su org activa a otra seguiría contando aquí, evitando
        // borrar la organización completa por error si todavía tiene otros miembros).
        let isLastMember = false;
        if (orgId) {
            const { count } = await supabase
                .from('organization_members')
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
