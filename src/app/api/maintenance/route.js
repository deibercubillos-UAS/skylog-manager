import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const authHeader = request.headers.get('Authorization');

    if (!userId || !authHeader) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Consultamos Drones y Logs en paralelo
    const [aircraftRes, logsRes] = await Promise.all([
      supabase.from('aircraft').select('*').eq('owner_id', userId),
      supabase.from('maintenance_logs').select('*, aircraft(model)').eq('owner_id', userId).order('maintenance_date', { ascending: false })
    ]);

    const drones = aircraftRes.data || [];
    const logs = logsRes.data || [];

    // Cálculo de KPIs en el Servidor
    const criticalCount = drones.filter(d => {
        const interval = d.maintenance_interval_hours || 50;
        return (d.total_hours % interval) > (interval * 0.9);
    }).length;

    const totalFleetHours = drones.reduce((acc, d) => acc + (d.total_hours || 0), 0);

    return NextResponse.json({
      drones,
      logs,
      kpis: {
        critical: criticalCount,
        totalHours: totalFleetHours.toFixed(1),
        pendingTasks: 12 // Dato simulado por ahora
      }
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
    try {
      const body = await request.json();
      const authHeader = request.headers.get('Authorization');
      const { userId, logData } = body;
  
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } }
      });
  
      const { data, error } = await supabase
        .from('maintenance_logs')
        .insert([{ ...logData, owner_id: userId }])
        .select();
  
      if (error) throw error;
      return NextResponse.json(data[0], { status: 201 });
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
}