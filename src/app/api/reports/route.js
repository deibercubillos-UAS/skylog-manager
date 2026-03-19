import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const reportType = searchParams.get('type'); 
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');
    const authHeader = request.headers.get('Authorization');

    if (!userId || !authHeader) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // 1. REPORTE SMS (REPARADO)
    if (reportType === 'sms') {
      const { data: smsData, error } = await supabase
        .from('sms_reports')
        .select('*, flights(flight_number)')
        .eq('owner_id', userId)
        .gte('occurrence_date', dateFrom)
        .lte('occurrence_date', dateTo);
      if (error) throw error;
      
      return NextResponse.json(smsData.map(row => ({
        FECHA: row.occurrence_date?.slice(0,10),
        REF_VUELO: row.flights?.flight_number || 'N/A',
        SEVERIDAD: row.severity.toUpperCase(),
        SUCESO: row.narrative?.slice(0, 40) + '...',
        ACCIONES: row.immediate_actions?.slice(0, 40) + '...'
      })));
    }

    // 2. REPORTE DE FLOTA (NUEVA LÓGICA AGRUPADA)
    if (reportType === 'flota') {
      const [dronesRes, flightsRes] = await Promise.all([
        supabase.from('aircraft').select('*').eq('owner_id', userId),
        supabase.from('flights').select('*').eq('owner_id', userId).gte('flight_date', dateFrom).lte('flight_date', dateTo)
      ]);

      return NextResponse.json(dronesRes.data.map(d => {
        const droneFlights = flightsRes.data.filter(f => f.aircraft_id === d.id);
        
        // Sumar duración del periodo
        let totalMins = 0;
        droneFlights.forEach(f => {
          if (f.takeoff_time && f.landing_time) {
            const [h1, m1] = f.takeoff_time.split(':').map(Number);
            const [h2, m2] = f.landing_time.split(':').map(Number);
            let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
            if (diff < 0) diff += 1440;
            totalMins += diff;
          }
        });

        return {
          DRONE: d.model,
          S_N: d.serial_number,
          VUELOS_PERIODO: droneFlights.length,
          HORAS_PERIODO: `${Math.floor(totalMins/60)}h ${totalMins%60}m`,
          MTOW: `${d.mtow}kg`,
          ESTADO: d.status
        };
      }));
    }

    // 3. REPORTE BITÁCORA (VUELOS INDIVIDUALES)
    const { data: flightData, error } = await supabase
      .from('flights')
      .select('*, pilots(name), aircraft(model)')
      .eq('owner_id', userId)
      .gte('flight_date', dateFrom)
      .lte('flight_date', dateTo);
    if (error) throw error;

    return NextResponse.json(flightData.map(row => {
      let duration = "00:00";
      if (row.takeoff_time && row.landing_time) {
        const [h1, m1] = row.takeoff_time.split(':').map(Number);
        const [h2, m2] = row.landing_time.split(':').map(Number);
        let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diff < 0) diff += 1440;
        duration = `${Math.floor(diff/60).toString().padStart(2,'0')}:${(diff%60).toString().padStart(2,'0')}`;
      }
      return {
        FECHA: row.flight_date,
        ID_REF: row.flight_number,
        PILOTO: row.pilots?.name || 'N/A',
        AERONAVE: row.aircraft?.model || 'N/A',
        UBICACION: row.location || 'N/A',
        DURACION: duration
      };
    }));

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}