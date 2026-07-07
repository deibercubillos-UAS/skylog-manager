// POST /api/admin/master/convert-independent  { targetUserId }
// Convierte cualquier cuenta en "piloto independiente": le crea una organización
// propia nueva (mismo patrón que el registro type='solo' — company_name/unique_code/
// slug), agrega una membresía nueva en organization_members (role='admin',
// subscription_plan='piloto') y proyecta esa membresía a `profiles` como activa.
//
// Deliberadamente NO destructivo: la membresía anterior del usuario (si tenía una)
// NO se toca ni se elimina — coincide con el modelo multi-org ya establecido (unirse
// a una org nunca migra ni destruye nada). El usuario simplemente queda con una
// organización propia adicional, activa, y puede volver a cambiar de organización
// después con el switcher si lo necesita.
import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { uniqueSlug } from '@/lib/slugify';
import { syncOrgMembership } from '@/lib/orgMembership';

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

    const { data: target } = await admin
      .from('profiles')
      .select('id, email, first_name, full_name, role')
      .eq('id', targetUserId)
      .maybeSingle();
    if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    if (target.role === 'superadmin') {
      return NextResponse.json({ error: 'No se puede convertir una cuenta superadmin.' }, { status: 403 });
    }

    // Organización nueva — mismo patrón que auth/register (type='solo').
    const orgName = `Piloto: ${target.first_name || target.full_name || target.email}`;
    const uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const slug = await uniqueSlug(orgName, async (candidate) => {
      const { data } = await admin.from('organizations').select('id').eq('slug', candidate).maybeSingle();
      return !!data;
    });

    const { data: newOrg, error: orgErr } = await admin
      .from('organizations')
      .insert([{ company_name: orgName, unique_code: uniqueCode, slug }])
      .select('id, company_name')
      .single();
    if (orgErr) throw orgErr;

    await syncOrgMembership(admin, {
      userId: targetUserId,
      organizationId: newOrg.id,
      role: 'admin',
      subscriptionPlan: 'piloto',
    });

    // Proyectar la membresía nueva a `profiles` como organización activa —
    // mismo mecanismo que POST /api/org/switch-active, para que las ~88
    // lecturas directas de `profiles` (Fase 7 diferida) reflejen el cambio.
    const { error: updateError } = await admin
      .from('profiles')
      .update({
        organization_id:         newOrg.id,
        active_organization_id:  newOrg.id,
        role:                    'admin',
        subscription_plan:       'piloto',
        epayco_customer_id:      null,
        epayco_subscription_id:  null,
        epayco_ref:              null,
        subscription_expires_at: null,
        subscription_status:     null,
        last_payment_date:       null,
      })
      .eq('id', targetUserId);
    if (updateError) throw updateError;

    return NextResponse.json({ success: true, organization: newOrg });
  } catch (err) {
    console.error('[admin/master/convert-independent]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
