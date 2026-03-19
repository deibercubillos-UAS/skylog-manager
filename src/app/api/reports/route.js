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

    // 1. REPORTE SMS (CORREGIDO FILTRO)
    if (reportType === 'sms') {
      const { data: smsData, error } = await supabase
        .from('sms_reports')
        .select('*, flights(flight_number)')
        .eq('owner_id', userId)
        .gte('created_at', `${dateFrom}T00:00:00`)
        .lte('created_at', `${dateTo}T23:59:59`);
      
      if (error) throw error;
      
      return NextResponse.json(smsData.map(row => ({
        FECHA: row.created_at?.slice(0,10),
        ID_VUELO: row.flights?.flight_number || 'N/A',
        SEVERIDAD: row.severity?.toUpperCase(),
        SUCESO: row.narrative?.slice(0, 50) || 'Sin detalle',
        ACCIONES: row.immediate_actions?.slice(0, 50) || 'N/A'
      })));
    }

    // 2. REPORTE DE FLOTA (SIMPLIFICADO)
    if (reportType === 'flota') {
      const [dronesRes, flightsRes] = await Promise.all([
        supabase.from('aircraft').select('*').eq('owner_id', userId),
        supabase.from('flights').select('*').eq('owner_id', userId).gte('flight_date', dateFrom).lte('flight_date', dateTo)
      ]);

      return NextResponse.json(dronesRes.data.map(d => {
        const droneFlights = flightsRes.data.filter(f => f.aircraft_id === d.id);
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
          AERONAVE: d.model,
          SERIE: d.serial_number,
          VUELOS: droneFlights.length,
          DURACION: `${Math.floor(totalMins/60)}:${(totalMins%60).toString().padStart(2,'0')}`,
          ESTADO: d.status
        };
      }));
    }

    // 3. REPORTE BITÁCORA
    const { data: flightData, error } = await supabase
      .from('flights')
      .select('*, pilots(name), aircraft(model)')
      .eq('owner_id', userId)
      .gte('flight_date', dateFrom)
      .lte('flight_date', dateTo);
    
    if (error) throw error;

    return NextResponse.json(flightData.map(row => {
      let dur = "00:00";
      if (row.takeoff_time && row.landing_time) {
        const [h1, m1] = row.takeoff_time.split(':').map(Number);
        const [h2, m2] = row.landing_time.split(':').map(Number);
        let d = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (d < 0) d += 1440;
        dur = `${Math.floor(d/60).toString().padStart(2,'0')}:${(d%60).toString().padStart(2,'0')}`;
      }
      return {
        FECHA: row.flight_date,
        ID_REF: row.flight_number,
        PILOTO: row.pilots?.name || 'N/A',
        AERONAVE: row.aircraft?.model || 'N/A',
        UBICACION: row.location || 'N/A',
        DURACION: dur
      };
    }));

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}