import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const reportType = searchParams.get('type'); // vuelos, aeronaves, sms
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');
    const pilotId = searchParams.get('pilotId');
    const aircraftId = searchParams.get('aircraftId');
    const authHeader = request.headers.get('Authorization');

    if (!userId || !authHeader) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    let query;
    if (reportType === 'sms') {
      query = supabase.from('sms_reports').select('*, flights(flight_number)');
    } else {
      query = supabase.from('flights').select('*, pilots(name), aircraft(model, serial_number)');
    }

    // Filtros base
    query = query.eq('owner_id', userId).gte('flight_date', dateFrom).lte('flight_date', dateTo);

    // Filtros opcionales
    if (pilotId && pilotId !== 'all') query = query.eq('pilot_id', pilotId);
    if (aircraftId && aircraftId !== 'all') query = query.eq('aircraft_id', aircraftId);

    const { data, error } = await query.order('flight_date', { ascending: true });
    if (error) throw error;

    // --- APLANAMIENTO DE DATOS EN EL SERVIDOR ---
    const flattenedData = data.map(row => ({
      FECHA: row.flight_date || row.occurrence_date?.slice(0, 10),
      ID_REF: row.flight_number || row.flights?.flight_number || 'N/A',
      DETALLE: row.mission_type || row.severity || 'Operación',
      PILOTO: row.pilots?.name || 'Sistema',
      EQUIPO: row.aircraft?.model || 'UAS',
      S_N: row.aircraft?.serial_number || 'N/A',
      UBICACION: row.location || 'Base'
    }));

    return NextResponse.json(flattenedData);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}