// POST /api/epayco/plans
// Sincroniza todos los planes de Bitafly con ePayco.
// Llama este endpoint UNA VEZ desde el dashboard de admin o desde curl.
// Ejemplo: curl -X POST https://bitafly.com/api/epayco/plans -H "x-admin-key: $ADMIN_SECRET"
import { NextResponse } from 'next/server';
import { syncPlan } from '@/lib/epayco';

export async function POST(request) {
  const adminKey = request.headers.get('x-admin-key');
  if (adminKey !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const plans = [
    ['piloto',      'monthly'],
    ['piloto',      'annual'],
    ['escuadrilla', 'monthly'],
    ['escuadrilla', 'annual'],
    ['flota',       'monthly'],
    ['flota',       'annual'],
  ];

  const results = [];
  for (const [planKey, billing] of plans) {
    try {
      const res = await syncPlan(planKey, billing);
      results.push({ plan: `${planKey}/${billing}`, status: 'ok', data: res });
    } catch (err) {
      results.push({ plan: `${planKey}/${billing}`, status: 'error', error: err.message });
    }
  }

  return NextResponse.json({ results });
}
