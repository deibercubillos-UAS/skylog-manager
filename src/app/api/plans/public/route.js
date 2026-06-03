// GET /api/plans/public — precios actuales de planes para landing pages (sin auth)
// Lee epayco_plan_config y devuelve { piloto: { monthly, annual }, escuadrilla: {...}, ... }
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('epayco_plan_config')
      .select('plan_key, billing, amount, trial_days')
      .order('plan_key')
      .order('billing');

    if (error) throw error;

    // Agrupa por plan → billing
    const result = {};
    for (const row of data ?? []) {
      if (!result[row.plan_key]) result[row.plan_key] = {};
      result[row.plan_key][row.billing] = {
        amount:    row.amount,
        trialDays: row.trial_days ?? null,
      };
    }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('[plans/public]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
