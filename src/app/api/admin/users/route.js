import { createAdminClient, createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { syncOrgMembership } from '@/lib/orgMembership';

export const dynamic = 'force-dynamic';

// Roles que un Admin puede asignar desde esta pantalla.
// superadmin queda explícitamente fuera: solo se asigna desde Master.
const ASSIGNABLE_ROLES = ['admin', 'gerente_sms', 'jefe_pilotos', 'piloto'];
const MANAGER_ROLES = ['superadmin', 'admin'];

async function requireManager() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado", status: 401 };

    const admin = createAdminClient();
    const { data: me } = await admin
        .from('profiles')
        .select('id, organization_id, role')
        .eq('id', user.id)
        .single();

    if (!me) return { error: "Perfil no encontrado", status: 404 };
    if (!MANAGER_ROLES.includes(me.role)) {
        return { error: `Acceso denegado. Rol actual: ${me.role}`, status: 403 };
    }
    return { admin, me };
}

// GET: listar usuarios de la misma organización del admin actual
export async function GET() {
    try {
        const guard = await requireManager();
        if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

        const { admin, me } = guard;

        const { data, error } = await admin
            .from('profiles')
            .select('id, email, full_name, first_name, last_name, phone, role, avatar_url, created_at, organization_id')
            .eq('organization_id', me.organization_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PATCH: cambiar el rol de un miembro de la misma organización
export async function PATCH(request) {
    try {
        const guard = await requireManager();
        if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

        const { admin, me } = guard;
        const body = await request.json();
        const { targetUserId, newRole } = body;

        if (!targetUserId || !newRole) {
            return NextResponse.json({ error: "targetUserId y newRole son requeridos" }, { status: 400 });
        }
        if (!ASSIGNABLE_ROLES.includes(newRole)) {
            return NextResponse.json({ error: `Rol '${newRole}' no asignable desde este panel.` }, { status: 400 });
        }

        // 1) El objetivo debe pertenecer a la misma organización que el solicitante.
        const { data: target, error: tErr } = await admin
            .from('profiles')
            .select('id, organization_id, role')
            .eq('id', targetUserId)
            .single();

        if (tErr || !target) return NextResponse.json({ error: "Usuario objetivo no encontrado" }, { status: 404 });
        if (target.organization_id !== me.organization_id) {
            return NextResponse.json({ error: "No puedes modificar miembros de otra organización." }, { status: 403 });
        }

        // 2) Nadie puede degradar a un superadmin desde este panel.
        if (target.role === 'superadmin') {
            return NextResponse.json({ error: "No se puede modificar un superadmin desde este panel." }, { status: 403 });
        }

        // 3) Si el cambio es quitar el último admin de la organización, bloquear.
        if (target.role === 'admin' && newRole !== 'admin') {
            const { count } = await admin
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('organization_id', me.organization_id)
                .eq('role', 'admin');
            if ((count || 0) <= 1) {
                return NextResponse.json({ error: "No se puede degradar al último Admin de la organización." }, { status: 400 });
            }
        }

        const { data, error } = await admin
            .from('profiles')
            .update({ role: newRole })
            .eq('id', targetUserId)
            .select('id, email, full_name, role')
            .single();

        if (error) throw error;

        // Fase 6 multi-org: refleja el cambio en organization_members —
        // se escribe sobre la org actualmente activa del miembro (target.organization_id),
        // no se asume que solo pertenece a una.
        await syncOrgMembership(admin, {
            userId: targetUserId,
            organizationId: target.organization_id,
            role: newRole,
        });

        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}