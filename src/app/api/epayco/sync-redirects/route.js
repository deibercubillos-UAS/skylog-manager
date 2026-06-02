// POST /api/epayco/sync-redirects
// Actualiza redirect_url en TODOS los planes de ePayco apuntando a Bitafly.
// Llamar una sola vez desde /admin/master después de deploy.
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { updatePlan } from '@/lib/epayco';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com').replace(/\/+$/, '');

export async function POST(request) {
  const adminKey = request.headers.get('x-admin-key');
  if (adminKey !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: planes, error } = await supabase
    .from('epayco_plan_config')
    .select('*');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const p of planes) {
    try {
      await updatePlan(p.epayco_id, {
        name:        p.name,
        description: p.description,
        amount:      p.amount,
        trialDays:   p.trial_days,
        billingKey:  p.billing,
        redirectUrl: `${SITE_URL}/dashboard/subscription/response`,
      });
      results.push({ id: p.id, status: 'ok' });
    } catch (err) {
      results.push({ id: p.id, status: 'error', error: err.message });
    }
  }

  return NextResponse.json({ results, redirectUrl: `${SITE_URL}/dashboard/subscription/response` });
}
