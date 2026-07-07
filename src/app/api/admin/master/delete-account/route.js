// POST /api/admin/master/delete-account  { targetUserId }
// Elimina por completo una cuenta desde el panel Master (superadmin). A diferencia
// de DELETE /api/auth/delete-account (self-service, solo el propio usuario), esta
// ruta permite al superadmin eliminar CUALQUIER cuenta.
//
// Mismo patrón de limpieza que ya usan las rutas self-service (auth/delete-account,
// user/delete), extendido a multi-organización: se revisan TODAS las membresías
// reales del usuario (organization_members), no solo su organización activa — si
// era el único miembro real de alguna, esa organización se elimina también
// (cascade borra flota/vuelos/pilotos de esa org). Las organizaciones donde todavía
// quedan otros miembros reales NUNCA se tocan.
import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { cancelSubscription, cancelSubscriptionsByEmail } from '@/lib/epayco';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: requester } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (requester?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso denegado. Se requiere rol: superadmin' }, { status: 403 });
    }

    const { targetUserId } = await request.json().catch(() => ({}));
    if (!targetUserId) return NextResponse.json({ error: 'targetUserId requerido' }, { status: 400 });

    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta desde este panel — usa la opción de eliminar cuenta en tu perfil.' }, { status: 400 });
    }

    const { data: target } = await admin
      .from('profiles')
      .select('id, email, role')
      .eq('id', targetUserId)
      .maybeSingle();
    if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    if (target.role === 'superadmin') {
      return NextResponse.json({ error: 'No se puede eliminar una cuenta superadmin desde este panel.' }, { status: 403 });
    }

    // Membresías reales ANTES de borrar nada — determina qué orgs quedarían huérfanas.
    const { data: memberships } = await admin
      .from('organization_members')
      .select('organization_id, epayco_subscription_id, subscription_plan')
      .eq('user_id', targetUserId);

    const orgsToDelete = [];
    for (const m of (memberships || [])) {
      const { count } = await admin
        .from('organization_members')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', m.organization_id);
      if ((count || 0) <= 1) orgsToDelete.push(m.organization_id);

      // Cancelar suscripción ePayco de esa membresía si existe (no-crítico).
      if (m.subscription_plan && m.subscription_plan !== 'piloto') {
        try {
          if (m.epayco_subscription_id) {
            await cancelSubscription(m.epayco_subscription_id);
          } else if (target.email) {
            await cancelSubscriptionsByEmail(target.email);
          }
        } catch (e) {
          console.warn('[admin/master/delete-account] ePayco:', e.message);
        }
      }
    }

    // Eliminar el usuario de Supabase Auth — cascade elimina `profiles` y TODAS
    // sus filas de `organization_members` (FK user_id → auth.users ON DELETE CASCADE).
    const { error: deleteError } = await admin.auth.admin.deleteUser(targetUserId);
    if (deleteError) throw deleteError;

    // Ahora sí, eliminar las organizaciones que quedaron sin ningún miembro real.
    for (const orgId of orgsToDelete) {
      await admin.from('organizations').delete().eq('id', orgId);
    }

    return NextResponse.json({ success: true, deletedOrganizations: orgsToDelete.length });
  } catch (err) {
    console.error('[admin/master/delete-account]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
