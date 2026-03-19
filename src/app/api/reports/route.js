import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const reportType = searchParams.get('type'); 
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');
    const pilotId = searchParams.get('pilotId');
    const aircraftId = searchParams.get('aircraftId');
    const authHeader = request.headers.get('Authorization');

    if (!userId || !authHeader) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    let query = supabase.from('flights').select('*, pilots(name), aircraft(model, serial_number)');
    query = query.eq('owner_id', userId).gte('flight_date', dateFrom).lte('flight_date', dateTo);

    if (pilotId && pilotId !== 'all') query = query.eq('pilot_id', pilotId);
    if (aircraftId && aircraftId !== 'all') query = query.eq('aircraft_id', aircraftId);

    const { data, error } = await query.order('flight_date', { ascending: true });
    if (error) throw error;

    // APLANAMIENTO CON CÁLCULO DE TIEMPO
    const flattenedData = data.map(row => {
      // Calcular duración en minutos
      let durationStr = "00:00";
      if (row.takeoff_time && row.landing_time) {
        const [h1, m1] = row.takeoff_time.split(':').map(Number);
        const [h2, m2] = row.landing_time.split(':').map(Number);
        let totalMin = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (totalMin < 0) totalMin += 1440; // Cruce de medianoche
        durationStr = `${Math.floor(totalMin / 60).toString().padStart(2, '0')}:${(totalMin % 60).toString().padStart(2, '0')}`;
      }

      return {
        FECHA: row.flight_date,
        ID_VUELO: row.flight_number || 'N/A',
        TRIPULANTE: row.pilots?.name || 'N/A',
        AERONAVE: row.aircraft?.model || 'N/A',
        S_N: row.aircraft?.serial_number || 'N/A',
        MISION: row.mission_type || 'N/A',
        DURACION: durationStr
      };
    });

    return NextResponse.json(flattenedData);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}