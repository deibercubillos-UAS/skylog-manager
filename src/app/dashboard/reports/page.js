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

    let data = [];

    if (reportType === 'sms') {
      // REPORTE SMS: Trae incidentes vinculados a vuelos
      const { data: smsData, error } = await supabase
        .from('sms_reports')
        .select('*, flights(flight_number, location)')
        .eq('owner_id', userId)
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo);
      if (error) throw error;
      
      data = smsData.map(row => ({
        FECHA: row.occurrence_date?.slice(0,10) || row.created_at?.slice(0,10),
        ID_REF: row.flights?.flight_number || 'N/A',
        SEVERIDAD: row.severity.toUpperCase(),
        UBICACION: row.location || row.flights?.location || 'N/A',
        DETALLE: row.narrative?.slice(0, 50) + '...' || 'Sin detalle',
        ACCIONES: row.immediate_actions || 'N/A'
      }));

    } else if (reportType === 'flota') {
      // REPORTE FLOTA: Resumen técnico de aeronaves
      const { data: fleetData, error } = await supabase
        .from('aircraft')
        .select('*')
        .eq('owner_id', userId);
      if (error) throw error;

      data = fleetData.map(row => ({
        MODELO: row.model,
        SERIE: row.serial_number,
        MTOW: `${row.mtow || 0} Kg`,
        HORAS_TOTALES: `${row.total_hours?.toFixed(1) || 0}h`,
        INT_MANT: `${row.maintenance_interval_hours || 50}h`,
        PROX_MANT: row.next_maintenance_date || 'No programada'
      }));

    } else {
      // REPORTE VUELOS (Bitácora)
      const { data: flightData, error } = await supabase
        .from('flights')
        .select('*, pilots(name), aircraft(model, serial_number)')
        .eq('owner_id', userId)
        .gte('flight_date', dateFrom)
        .lte('flight_date', dateTo);
      if (error) throw error;

      data = flightData.map(row => {
        let durationStr = "00:00";
        if (row.takeoff_time && row.landing_time) {
          const [h1, m1] = row.takeoff_time.split(':').map(Number);
          const [h2, m2] = row.landing_time.split(':').map(Number);
          let totalMin = (h2 * 60 + m2) - (h1 * 60 + m1);
          if (totalMin < 0) totalMin += 1440;
          durationStr = `${Math.floor(totalMin / 60).toString().padStart(2, '0')}:${(totalMin % 60).toString().padStart(2, '0')}`;
        }
        return {
          FECHA: row.flight_date,
          ID_VUELO: row.flight_number || 'N/A',
          TRIPULANTE: row.pilots?.name || 'N/A',
          AERONAVE: row.aircraft?.model || 'N/A',
          UBICACION: row.location || 'N/A',
          DURACION: durationStr
        };
      });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}