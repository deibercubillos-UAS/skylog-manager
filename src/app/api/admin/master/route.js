import { createAdminClient, createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { syncOrgMembership } from '@/lib/orgMembership';

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
        console.log(`[master] Intento de acceso - Usuario: ${user.email} - Rol: ${profile?.role}`);

        if (profile?.role !== 'superadmin') {
            return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
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

        // ── Auth: verificar identidad real del solicitante ──────────────────
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

        // ── Autorización: solo superadmin puede usar este endpoint ──────────
        const { data: requester } = await adminSupabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (requester?.role !== 'superadmin') {
            console.warn(`PATCH /api/admin/master — acceso denegado: ${user.email} (rol: ${requester?.role})`);
            return NextResponse.json({ error: "Acceso denegado. Se requiere rol: superadmin" }, { status: 403 });
        }

        const body = await request.json();
        const { targetUserId, updateData } = body;

        if (!targetUserId || !updateData) {
            return NextResponse.json({ error: "targetUserId y updateData son requeridos" }, { status: 400 });
        }

        // ── Allowlist: superadmin solo puede modificar estos campos ─────────
        const ALLOWED_FIELDS = ['role', 'subscription_plan', 'subscription_expires_at', 'full_name', 'first_name', 'last_name'];
        const safeUpdate = Object.fromEntries(
            Object.entries(updateData).filter(([key]) => ALLOWED_FIELDS.includes(key))
        );

        if (Object.keys(safeUpdate).length === 0) {
            return NextResponse.json({ error: "No hay campos válidos para actualizar" }, { status: 400 });
        }

        console.log(`[master] PATCH — ${user.email} actualizando perfil ${targetUserId}:`, Object.keys(safeUpdate));

        const { data, error } = await adminSupabase
            .from('profiles')
            .update({ ...safeUpdate, updated_at: new Date().toISOString() })
            .eq('id', targetUserId)
            .select();
        if (error) throw error;

        // Fase 6 multi-org: reflejar el mismo cambio en organization_members
        // (el trigger-puente de profiles ya lo hace, esto es defensa en profundidad).
        if (data[0]?.organization_id && ('role' in safeUpdate || 'subscription_plan' in safeUpdate || 'subscription_expires_at' in safeUpdate)) {
            await syncOrgMembership(adminSupabase, {
                userId: targetUserId,
                organizationId: data[0].organization_id,
                role: safeUpdate.role,
                subscriptionPlan: safeUpdate.subscription_plan,
                subscriptionExpiresAt: safeUpdate.subscription_expires_at,
            });
        }

        return NextResponse.json(data[0]);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
