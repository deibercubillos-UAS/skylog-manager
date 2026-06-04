// GET /api/plans/public — precios actuales de planes para landing pages (sin auth)
// Lee epayco_plan_config y devuelve { piloto: { monthly, annual }, escuadrilla: {...}, ... }
import { NextResponse } from 'next/server';
import { createClient as createJSClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Usar cliente anon (no service role) — epayco_plan_config es lectura pública.
    // Reducir la superficie del service role key (B-4).
    const anon = createJSClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data, error } = await anon
      .from('epayco_plan_config')
      .select('plan_key, billing, amount, trial_days, replay_retention_days, replay_max_flights')
      .order('plan_key')
      .order('billing');

    if (error) throw error;

    // Agrupa por plan → billing
    const result = {};
    for (const row of data ?? []) {
      if (!result[row.plan_key]) result[row.plan_key] = {};
      result[row.plan_key][row.billing] = {
        amount:               row.amount,
        trialDays:            row.trial_days ?? null,
        replayRetentionDays:  row.replay_retention_days ?? 30,
        replayMaxFlights:     row.replay_max_flights ?? 10,
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
