/**
 * POST /api/org/switch-active
 *
 * Fase 5 del refactor multi-organización: cambia cuál de las organizaciones
 * de la cuenta autenticada queda "activa" (una por cuenta, no por
 * pestaña/sesión — decisión de v1 confirmada con el usuario). Proyecta la
 * membresía elegida (role/subscription_plan/campos de ePayco) de vuelta a
 * `profiles`, que es lo que hace que las ~88 lecturas directas de `profiles`
 * todavía sin migrar (Fase 7, diferida) reflejen la organización activa sin
 * tener que tocarlas.
 *
 * Body: { organization_id }
 */
import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { organization_id: organizationId } = await request.json().catch(() => ({}));
    if (!organizationId) return NextResponse.json({ error: 'organization_id requerido' }, { status: 400 });

    const supabase = await createClientSSR();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

    const admin = createAdminClient();

    const { data: membership } = await admin
      .from('organization_members')
      .select('organization_id, role, subscription_plan, epayco_customer_id, epayco_subscription_id, epayco_ref, subscription_expires_at, subscription_status, last_payment_date')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'No perteneces a esa organización.' }, { status: 403 });
    }

    const { data: org } = await admin
      .from('organizations')
      .select('company_name')
      .eq('id', organizationId)
      .maybeSingle();

    const { error: updateError } = await admin
      .from('profiles')
      .update({
        organization_id:          membership.organization_id,
        active_organization_id:   membership.organization_id,
        role:                     membership.role,
        subscription_plan:        membership.subscription_plan,
        epayco_customer_id:       membership.epayco_customer_id,
        epayco_subscription_id:   membership.epayco_subscription_id,
        epayco_ref:               membership.epayco_ref,
        subscription_expires_at:  membership.subscription_expires_at,
        subscription_status:      membership.subscription_status,
        last_payment_date:        membership.last_payment_date,
      })
      .eq('id', user.id);
    if (updateError) throw updateError;

    return NextResponse.json({ success: true, orgId: organizationId, orgName: org?.company_name || null, role: membership.role });
  } catch (err) {
    console.error('[org/switch-active]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
