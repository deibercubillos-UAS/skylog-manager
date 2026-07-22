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

        // Roster real = organization_members, no profiles.organization_id —
        // esa columna solo refleja la organización ACTIVA de cada cuenta
        // ahora mismo (multi-org). Un miembro real que cambió su organización
        // activa a otra dejaba de aparecer aquí aunque siguiera siendo parte
        // del equipo de esta org.
        const { data: memberships, error: memErr } = await admin
            .from('organization_members')
            .select('user_id, role')
            .eq('organization_id', me.organization_id)
            .eq('is_active', true);
        if (memErr) throw memErr;
        if (!memberships?.length) return NextResponse.json([]);

        const userIds = memberships.map(m => m.user_id);
        const { data: profiles, error } = await admin
            .from('profiles')
            .select('id, email, full_name, first_name, last_name, phone, avatar_url, created_at')
            .in('id', userIds)
            .order('created_at', { ascending: false });
        if (error) throw error;

        const roleByUser = Object.fromEntries(memberships.map(m => [m.user_id, m.role]));
        const data = (profiles || []).map(p => ({
            ...p,
            role: roleByUser[p.id] || 'piloto',
            organization_id: me.organization_id,
        }));
        return NextResponse.json(data);
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

        // 1) El objetivo debe ser miembro REAL de esta organización — vía
        // organization_members, no profiles.organization_id (que solo refleja
        // la organización activa de la cuenta ahora mismo; un miembro que
        // cambió su activa a otra org seguía siendo miembro real de esta).
        const { data: membership, error: mErr } = await admin
            .from('organization_members')
            .select('role')
            .eq('user_id', targetUserId)
            .eq('organization_id', me.organization_id)
            .eq('is_active', true)
            .maybeSingle();
        if (mErr) throw mErr;
        if (!membership) {
            return NextResponse.json({ error: "No puedes modificar miembros de otra organización." }, { status: 403 });
        }

        // 2) Nadie puede degradar a un superadmin desde este panel.
        if (membership.role === 'superadmin') {
            return NextResponse.json({ error: "No se puede modificar un superadmin desde este panel." }, { status: 403 });
        }

        // 3) Si el cambio es quitar el último admin de la organización, bloquear.
        if (membership.role === 'admin' && newRole !== 'admin') {
            const { data: admins, error: cErr } = await admin
                .from('organization_members')
                .select('user_id')
                .eq('organization_id', me.organization_id)
                .eq('role', 'admin')
                .eq('is_active', true);
            if (cErr) throw cErr;
            if ((admins || []).length <= 1) {
                return NextResponse.json({ error: "No se puede degradar al último Admin de la organización." }, { status: 400 });
            }
        }

        const { data: targetProfile, error: tpErr } = await admin
            .from('profiles')
            .select('id, email, full_name, active_organization_id')
            .eq('id', targetUserId)
            .single();
        if (tpErr || !targetProfile) return NextResponse.json({ error: "Usuario objetivo no encontrado" }, { status: 404 });

        // organization_members es la fuente real del rol por-organización —
        // se escribe siempre sobre ESTA org (me.organization_id), nunca sobre
        // la que el miembro tenga activa (pueden ser distintas en multi-org).
        await syncOrgMembership(admin, {
            userId: targetUserId,
            organizationId: me.organization_id,
            role: newRole,
        });

        // profiles.role solo se actualiza si esta organización es la que el
        // miembro tiene activa ahora mismo — profiles/getOrgContext reflejan
        // únicamente la organización activa; escribir aquí cuando no lo es
        // pisaría el rol de la organización que sí tiene activa.
        let responseData = { id: targetProfile.id, email: targetProfile.email, full_name: targetProfile.full_name, role: newRole };
        if (targetProfile.active_organization_id === me.organization_id) {
            const { data, error } = await admin
                .from('profiles')
                .update({ role: newRole })
                .eq('id', targetUserId)
                .select('id, email, full_name, role')
                .single();
            if (error) throw error;
            responseData = data;
        }

        return NextResponse.json(responseData);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}