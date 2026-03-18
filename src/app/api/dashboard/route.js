import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const authHeader = request.headers.get('Authorization');

    if (!userId || !authHeader) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Consulta de datos en paralelo
    const [aircraftRes, pilotsRes, flightsRes] = await Promise.all([
      supabase.from('aircraft').select('*').eq('owner_id', userId),
      supabase.from('pilots').select('*').eq('owner_id', userId),
      supabase.from('flights').select('*, pilots(name), aircraft(model)').eq('owner_id', userId).order('flight_date', { ascending: false })
    ]);

    const aircraft = aircraftRes.data || [];
    const pilots = pilotsRes.data || [];
    const flights = flightsRes.data || [];

    // --- 1. LÓGICA DE GRÁFICO (Últimos 6 meses reales) ---
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const chartLabels = [];
    const chartValues = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mName = monthNames[d.getMonth()];
      const year = d.getFullYear();
      const monthIdx = d.getMonth();

      chartLabels.push(mName);
      
      const count = flights.filter(f => {
        const fDate = new Date(f.flight_date);
        return fDate.getMonth() === monthIdx && fDate.getFullYear() === year;
      }).length;
      
      chartValues.push(count);
    }

    // --- 2. LÓGICA DE ALERTAS CRÍTICAS ---
    const alerts = [];
    const now = new Date();
    const limitDate = new Date();
    limitDate.setDate(now.getDate() + 30); // Ventana de 30 días

    // Alertas Médicas (Pilotos)
    pilots.forEach(p => {
      if (p.medical_expiry && new Date(p.medical_expiry) < limitDate) {
        alerts.push({
          id: `med-${p.id}`,
          type: 'medical',
          title: p.name,
          desc: 'Certificado Médico por vencer',
          val: p.medical_expiry
        });
      }
    });

    // Alertas de Mantenimiento (Aeronaves)
    aircraft.forEach(a => {
      const interval = a.maintenance_interval_hours || 50;
      const hoursRemaining = interval - (a.total_hours % interval);
      if (hoursRemaining < 5) { // Alerta si faltan menos de 5 horas
        alerts.push({
          id: `maint-${a.id}`,
          type: 'maint',
          title: a.model,
          desc: 'Servicio técnico requerido',
          val: `${hoursRemaining.toFixed(1)}h restantes`
        });
      }
    });

    return NextResponse.json({
      stats: {
        hours: aircraft.reduce((acc, a) => acc + (a.total_hours || 0), 0).toFixed(1),
        operational: `${aircraft.filter(a => a.status === 'Operativo').length}/${aircraft.length}`,
        pilots: pilots.length,
        smsAlerts: alerts.length
      },
      chart: { labels: chartLabels, data: chartValues },
      criticalAlerts: alerts.slice(0, 3), // Mostramos las 3 más urgentes
      recentActivity: flights.slice(0, 5)
    });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}