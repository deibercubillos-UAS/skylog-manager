// POST /api/epayco/plans  → crea planes en ePayco y guarda sus UIDs en Supabase
// GET  /api/epayco/plans  → lista planes de ePayco y sincroniza UIDs en Supabase
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { createPlan, listPlans } from '@/lib/epayco';
import { EPAYCO_PLANS } from '@/lib/planLimits';

// GET — obtiene la lista de planes desde ePayco y guarda sus UIDs en Supabase
export async function GET(request) {
  const adminKey = request.headers.get('x-admin-key');
  if (adminKey !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const planes = await listPlans();
    const supabase = createAdminClient();

    // Actualiza el epayco_uid de cada plan encontrado por epayco_id
    const updates = [];
    for (const p of planes) {
      const epaycoId = p.id_plan || p.id;
      if (!epaycoId || !p.uid) continue;
      const { error } = await supabase
        .from('epayco_plan_config')
        .update({ epayco_uid: p.uid })
        .eq('epayco_id', epaycoId);
      updates.push({ epaycoId, uid: p.uid, error: error?.message });
    }

    return NextResponse.json({ planes, updates });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — crea todos los planes de Bitafly en ePayco y guarda sus UIDs
export async function POST(request) {
  const adminKey = request.headers.get('x-admin-key');
  if (adminKey !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const results = [];

  for (const [planKey, billings] of Object.entries(EPAYCO_PLANS)) {
    for (const [billingKey, cfg] of Object.entries(billings)) {
      try {
        const res = await createPlan(cfg, billingKey);
        const uid = res?.data?.uid || res?.uid;

        // Guarda el UID en Supabase si ePayco lo devolvió
        if (uid) {
          await supabase
            .from('epayco_plan_config')
            .update({ epayco_uid: uid })
            .eq('id', `${planKey}_${billingKey}`);
        }

        results.push({ plan: `${planKey}/${billingKey}`, status: 'ok', uid });
      } catch (err) {
        results.push({ plan: `${planKey}/${billingKey}`, status: 'error', error: err.message });
      }
    }
  }

  return NextResponse.json({ results });
}
