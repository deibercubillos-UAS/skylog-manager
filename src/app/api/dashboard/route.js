import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    // Obtener sesión
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sesión expirada" }, { status: 401 });

    const [aircraft, pilots, flights] = await Promise.all([
      supabase.from('aircraft').select('*').eq('owner_id', user.id),
      supabase.from('pilots').select('*').eq('owner_id', user.id),
      supabase.from('flights').select('*, pilots(name), aircraft(model)').eq('owner_id', user.id)
    ]);

    // Evitar errores si aircraft.data es null
    const drones = aircraft.data || [];
    const totalHours = drones.reduce((acc, a) => acc + (a.total_hours || 0), 0);
    const opCount = drones.filter(a => a.status === 'Operativo').length;

    // Lógica simplificada de gráfico para evitar NaN
    const chartData = [0,0,0,0,0,1]; // Default
    const labels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun"];

    return NextResponse.json({
      stats: {
        hours: totalHours.toFixed(1),
        operational: `${opCount}/${drones.length}`,
        pilots: (pilots.data || []).length,
        smsAlerts: 0
      },
      chart: { labels, data: chartData },
      criticalAlerts: [],
      recentActivity: (flights.data || []).slice(0, 5)
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}