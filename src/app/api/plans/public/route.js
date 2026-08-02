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

    // Sin caché de CDN/edge: un superadmin puede cambiar precios desde
    // /admin/master y necesita que se reflejen de inmediato, no en hasta
    // 5 minutos. Bug real encontrado (2026-08-02): con s-maxage=300 el
    // borde de Vercel siguió sirviendo un precio viejo bastante después de
    // vencido el TTL nominal — tráfico bajísimo de este endpoint hace que
    // el costo de no cachear sea insignificante frente al riesgo de mostrar
    // un precio incorrecto.
    // DEBUG TEMPORAL — quitar después de diagnosticar el problema de precios stale
    const k = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    result.__debug_supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    result.__debug_anon_key_masked = k ? `${k.slice(0,24)}...${k.slice(-12)} (len=${k.length})` : null;
    result.__debug_raw_rows = data;
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[plans/public]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
