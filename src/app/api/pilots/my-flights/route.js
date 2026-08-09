/**
 * GET /api/pilots/my-flights
 *
 * Bitácora consolidada del piloto autenticado — TODOS sus vuelos como PIC,
 * en CUALQUIER organización donde haya volado (no solo la organización
 * activa hoy). Pensado para el piloto independiente que se unió a una o
 * más organizaciones (ver join-org-additional/approve-join): sus vuelos en
 * cada organización quedan guardados con el `organization_id` de esa
 * organización — sin este endpoint, su cuenta independiente nunca vería
 * ese historial, solo lo que voló bajo su propia organización.
 *
 * Privacidad: solo devuelve vuelos donde el piloto (`flights.pilot_id`,
 * vía `pilots.profile_id`) es EL PROPIO usuario autenticado — nunca datos
 * de otros pilotos ni de la organización más allá de su nombre. Usa
 * createAdminClient() porque cruza organizaciones (RLS normal solo deja
 * leer la organización activa), pero el filtro por profile_id propio hace
 * que el resultado sea exactamente lo mismo que ya podría ver el usuario
 * si estuviera activo en cada una de esas organizaciones a la vez.
 *
 * Campos devueltos (deliberadamente acotados — fecha/operación/tiempo de
 * vuelo/organización, nada operativo adicional de la organización):
 * { flight_date, mission_type, duration_hours, organization_name }
 */
import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

function flightHours(f) {
  if (f.total_time) return Number(f.total_time) || 0;
  if (!f.takeoff_time || !f.landing_time) return 0;
  const [h1, m1] = f.takeoff_time.split(':').map(Number);
  const [h2, m2] = f.landing_time.split(':').map(Number);
  const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  return mins > 0 ? mins / 60 : 0;
}

export async function GET() {
  try {
    const supabase = await createClientSSR();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const admin = createAdminClient();

    // Todas las filas `pilots` que representan a este usuario, en cualquier
    // organización (una fila por organización donde ha sido tripulante).
    const { data: pilotRows, error: pErr } = await admin
      .from('pilots')
      .select('id, organization_id')
      .eq('profile_id', user.id);
    if (pErr) throw pErr;
    if (!pilotRows?.length) return NextResponse.json([]);

    const pilotIds = pilotRows.map(p => p.id);
    const orgIds = [...new Set(pilotRows.map(p => p.organization_id))];

    const [{ data: flights, error: fErr }, { data: orgs, error: oErr }] = await Promise.all([
      admin
        .from('flights')
        .select('flight_date, mission_type, total_time, takeoff_time, landing_time, organization_id')
        .in('pilot_id', pilotIds)
        .order('flight_date', { ascending: false }),
      admin
        .from('organizations')
        .select('id, company_name')
        .in('id', orgIds),
    ]);
    if (fErr) throw fErr;
    if (oErr) throw oErr;

    const orgNameById = Object.fromEntries((orgs || []).map(o => [o.id, o.company_name]));

    const result = (flights || []).map(f => ({
      flight_date:       f.flight_date,
      mission_type:      f.mission_type || 'Sin especificar',
      duration_hours:    Number(flightHours(f).toFixed(2)),
      organization_name: orgNameById[f.organization_id] || 'Organización',
    }));

    const res = NextResponse.json(result);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err) {
    console.error('[pilots/my-flights]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
