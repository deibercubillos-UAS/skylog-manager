// POST /api/epayco/sync-redirect
// Actualiza el redirect_url en todos los planes de ePayco de una vez.
// Accesible solo para superadmin (sesión activa).
import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { updatePlan } from '@/lib/epayco';
import { EPAYCO_PLANS } from '@/lib/planLimits';

export async function POST(request) {
  const supabase = await createClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Solo superadmin' }, { status: 403 });
  }

  const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com';
  const redirectUrl = `${SITE}/dashboard/subscription/response`;
  const results = [];

  for (const [planKey, billings] of Object.entries(EPAYCO_PLANS)) {
    for (const [billingKey, cfg] of Object.entries(billings)) {
      try {
        await updatePlan(cfg.epaycoId, {
          name:        cfg.name,
          description: cfg.description,
          amount:      cfg.amount,
          trialDays:   cfg.trialDays ?? 0,
          billingKey,
          redirectUrl,
        });
        results.push({ plan: `${planKey}/${billingKey}`, status: 'ok', redirectUrl });
      } catch (err) {
        results.push({ plan: `${planKey}/${billingKey}`, status: 'error', error: err.message });
      }
    }
  }

  return NextResponse.json({ results, redirectUrl });
}
