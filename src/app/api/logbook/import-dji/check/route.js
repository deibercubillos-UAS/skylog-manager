import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

/**
 * POST /api/logbook/import-dji/check
 *
 * Body: { pairs: ["YYYY-MM-DD|HH:MM", ...] }
 *
 * Alternativa POST al GET con query-string para soportar
 * carpetas grandes (>50 archivos) sin superar el límite de URL.
 * Devuelve cuáles de los pares enviados ya fueron importados.
 */
export async function POST(request) {
  try {
    const supabaseUser = await createClientSSR();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: prof } = await supabaseUser
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!prof?.organization_id) {
      return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
    }

    const body = await request.json();
    const pairs = (body.pairs ?? [])
      .map(p => { const [date, time] = String(p).split('|'); return { date, time }; })
      .filter(p => p.date && p.time);

    if (!pairs.length) return NextResponse.json({ existing: [] });

    const supabaseAdmin = createAdminClient();
    const uniqueDates = [...new Set(pairs.map(p => p.date))];

    const { data: rows } = await supabaseAdmin
      .from('flights')
      .select('flight_date, takeoff_time')
      .eq('organization_id', prof.organization_id)
      .eq('imported', true)
      .in('flight_date', uniqueDates);

    const existingSet = new Set(
      (rows ?? []).map(r => `${r.flight_date}|${r.takeoff_time}`)
    );

    const existing = pairs
      .map(p => `${p.date}|${p.time}`)
      .filter(key => existingSet.has(key));

    return NextResponse.json({ existing });

  } catch (err) {
    console.error('[import-dji/check POST]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
