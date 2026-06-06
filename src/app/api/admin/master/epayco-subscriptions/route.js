// GET  /api/admin/master/epayco-subscriptions → lista suscripciones de ePayco
// POST /api/admin/master/epayco-subscriptions { id } → cancela suscripción por _id

import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabaseServer';
import { listSubscriptions, cancelSubscription } from '@/lib/epayco';

export const dynamic = 'force-dynamic';

async function verifySuperadmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'superadmin') return null;
  return user;
}

export async function GET() {
  try {
    const user = await verifySuperadmin();
    if (!user) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

    const subs = await listSubscriptions();
    // Normalizar estructura variable de la respuesta de ePayco
    const normalized = subs.map(s => ({
      id:         s.id         || s._id         || s.uid         || s.subscription_id || null,
      email:      s.customer_data?.email || s.email || s.cliente?.email || s.subscriber?.email || '—',
      status:     s.status     || '—',
      plan:       s.plan?.name || s.id_plan     || s.plan_id     || '—',
      created_at: s.created_at || s.date_created || null,
      _raw: s,
    }));

    return NextResponse.json(normalized);
  } catch (err) {
    console.error('[epayco-subscriptions GET]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await verifySuperadmin();
    if (!user) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

    console.log(`[epayco-subscriptions] cancelando id=${id} por superadmin=${user.email}`);
    const result = await cancelSubscription(id);

    // También limpiar el perfil en Supabase si hay un usuario con ese subscription_id
    const admin = createAdminClient();
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, email')
      .eq('epayco_subscription_id', id);

    for (const p of profiles || []) {
      await admin.from('profiles').update({
        subscription_plan:       'piloto',
        epayco_subscription_id:  null,
        epayco_ref:              null,
        subscription_expires_at: null,
        updated_at:              new Date().toISOString(),
      }).eq('id', p.id);
      console.log(`[epayco-subscriptions] perfil degradado a piloto: ${p.email}`);
    }

    return NextResponse.json({ ok: true, epayco: result, profilesUpdated: profiles?.length || 0 });
  } catch (err) {
    console.error('[epayco-subscriptions POST]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
