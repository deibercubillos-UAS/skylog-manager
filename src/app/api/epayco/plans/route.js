// POST /api/epayco/plans       → crea planes en ePayco y guarda sus UIDs
// GET  /api/epayco/plans       → sincroniza UIDs desde ePayco a Supabase
// GET  /api/epayco/plans?debug → muestra respuesta cruda de ePayco sin modificar nada
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { createPlan, listPlans } from '@/lib/epayco';
import { EPAYCO_PLANS } from '@/lib/planLimits';

// Extrae el UID del plan de la respuesta de ePayco, probando todos los campos posibles
function extractUid(p) {
  return p.uid || p.planUid || p.plan_uid || p.uidPlan ||
         p._id  || p.planId  || p.plan_id || p.id      || null;
}

// Extrae el id_plan (nombre clave) del plan
function extractIdPlan(p) {
  return p.id_plan || p.idPlan || p.planName || p.name_plan || null;
}

export async function GET(request) {
  const adminKey = request.headers.get('x-admin-key');
  if (adminKey !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const debug = searchParams.has('debug');

  try {
    const raw = await listPlans();

    // Modo debug: devuelve la respuesta cruda sin tocar Supabase
    if (debug) {
      return NextResponse.json({
        debug:        true,
        total:        raw.length,
        sample:       raw[0] ?? null,      // primer plan completo para ver campos
        allKeys:      raw[0] ? Object.keys(raw[0]) : [],
        planes:       raw,
      });
    }

    const supabase = createAdminClient();
    const updates  = [];

    for (const p of raw) {
      const uid     = extractUid(p);
      const idPlan  = extractIdPlan(p);

      if (!uid) {
        updates.push({ idPlan, uid: null, error: `UID no encontrado. Campos disponibles: ${Object.keys(p).join(', ')}` });
        continue;
      }

      // Intenta hacer match por epayco_id (id_plan) y también por name
      const { data: matched } = await supabase
        .from('epayco_plan_config')
        .select('id, epayco_id, name')
        .or(`epayco_id.eq.${idPlan},name.ilike.%${p.name ?? ''}%`)
        .limit(1)
        .single();

      if (!matched) {
        updates.push({ idPlan, uid, error: `Sin match en Supabase para id_plan="${idPlan}"` });
        continue;
      }

      const { error } = await supabase
        .from('epayco_plan_config')
        .update({ epayco_uid: uid })
        .eq('id', matched.id);

      updates.push({ id: matched.id, idPlan, uid, error: error?.message ?? null });
    }

    const ok = updates.filter(u => !u.error).length;
    return NextResponse.json({ total: raw.length, synced: ok, updates });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const adminKey = request.headers.get('x-admin-key');
  if (adminKey !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const results  = [];

  for (const [planKey, billings] of Object.entries(EPAYCO_PLANS)) {
    for (const [billingKey, cfg] of Object.entries(billings)) {
      try {
        const res = await createPlan(cfg, billingKey);
        const uid = res?.data?.uid || res?.uid || extractUid(res?.data ?? res ?? {});

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

function extractUid(p) {
  return p.uid || p.planUid || p.plan_uid || p.uidPlan ||
         p._id  || p.planId  || p.plan_id || p.id      || null;
}
