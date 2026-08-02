// GET /api/plans/public — precios actuales de planes para landing pages (sin auth)
// Lee epayco_plan_config y devuelve { piloto: { monthly, annual }, escuadrilla: {...}, ... }
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // ⚠️ Bug real confirmado (2026-08-02): con el cliente anon, este endpoint
    // servía precios desactualizados de forma indefinida en producción (mismo
    // proyecto/URL/anon key verificados carácter por carácter, misma tabla,
    // misma política RLS pública sin filtro) — mientras que /api/epayco/config
    // (idéntico entorno Vercel, mismo proyecto, pero con createAdminClient())
    // siempre devolvió el valor correcto. Aislado con __debug_raw_rows: la fila
    // cruda YA llegaba mal ANTES de cualquier procesamiento en este archivo, y
    // se descartaron caché de navegador/Service Worker, Cloudflare (purgado sin
    // efecto) y borde de Vercel (Cache-Control: no-store, x-vercel-cache: MISS)
    // como causa. Todo apunta a un caché específico de Supabase para lecturas
    // con clave anónima que no se estaba invalidando. epayco_plan_config no
    // tiene datos sensibles (son precios públicos) — se usa el cliente admin
    // para esta lectura en particular, igual que ya hacía el panel Master.
    const admin = createAdminClient();
    const { data, error } = await admin
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
    // 5 minutos. Tráfico bajísimo de este endpoint hace insignificante el
    // costo de no cachear frente al riesgo de mostrar un precio incorrecto.
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[plans/public]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
