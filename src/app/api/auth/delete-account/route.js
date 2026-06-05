/**
 * DELETE /api/auth/delete-account
 * Elimina la cuenta del usuario autenticado.
 * - Cancela suscripción en ePayco si existe
 * - Elimina el usuario de Supabase Auth (cascade elimina profiles, orgs sin owner, etc.)
 * - Solo el propio usuario puede eliminarse (no superadmin puede eliminar a otros aquí)
 */
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { cancelSubscriptionsByEmail } from '@/lib/epayco';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function DELETE(request) {
  try {
    const supabase = await createClientSSR();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { orgId } = await getOrgContext(supabase);
    const supabaseAdmin = createAdminClient();

    // Leer perfil para saber si tiene suscripción activa
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, subscription_plan, epayco_subscription_id')
      .eq('id', user.id)
      .maybeSingle();

    // Cancelar suscripción en ePayco si existe (no-crítico si falla)
    if (profile?.subscription_plan && profile.subscription_plan !== 'piloto') {
      try {
        if (profile.epayco_subscription_id) {
          const { cancelSubscription } = await import('@/lib/epayco');
          await cancelSubscription(profile.epayco_subscription_id);
        } else if (profile.email) {
          await cancelSubscriptionsByEmail(profile.email);
        }
      } catch (err) {
        console.warn('[delete-account] No se pudo cancelar suscripción ePayco:', err.message);
      }
    }

    // Si el usuario es el único admin de la org, eliminar la org también
    if (orgId) {
      const { count: adminCount } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .in('role', ['admin', 'superadmin']);

      if (adminCount <= 1) {
        // Único admin: eliminar organización completa (cascade elimina aeronaves, pilotos, vuelos)
        await supabaseAdmin.from('organizations').delete().eq('id', orgId);
      }
    }

    // Eliminar usuario de Supabase Auth (service_role bypasea confirmaciones)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[delete-account]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
