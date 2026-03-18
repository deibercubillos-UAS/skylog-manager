import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const [aircraft, pilots, flights] = await Promise.all([
      supabase.from('aircraft').select('*').eq('owner_id', userId),
      supabase.from('pilots').select('*').eq('owner_id', userId),
      supabase.from('flights').select('*, pilots(name), aircraft(model)').eq('owner_id', userId).order('created_at', { ascending: false })
    ]);

    const drones = aircraft.data || [];
    const totalHours = drones.reduce((acc, a) => acc + (a.total_hours || 0), 0);
    const opCount = drones.filter(a => a.status === 'Operativo').length;

    return NextResponse.json({
      stats: {
        hours: totalHours.toFixed(1),
        operational: `${opCount}/${drones.length}`,
        pilots: (pilots.data || []).length,
        smsAlerts: 0
      },
      chart: { labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"], data: [0, 0, 0, 0, 0, 0] },
      criticalAlerts: [],
      recentActivity: (flights.data || []).slice(0, 5)
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}