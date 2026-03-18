import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    // Simulación de obtención de usuario (En una app real usaríamos cookies/auth helper)
    // Por ahora, para mantener la lógica funcional, el frontend pasará el userId o usaremos el session
    const { data: { user } } = await supabase.auth.getUser(request.headers.get('Authorization')?.split(' ')[1]);

    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // 1. Consultas en paralelo a la base de datos
    const [aircraft, pilots, flights] = await Promise.all([
      supabase.from('aircraft').select('*').eq('owner_id', user.id),
      supabase.from('pilots').select('*').eq('owner_id', user.id),
      supabase.from('flights').select('*, pilots(name), aircraft(model)').eq('owner_id', user.id).order('created_at', { ascending: false })
    ]);

    // 2. Cálculos de KPIs
    const totalHours = aircraft.data?.reduce((acc, a) => acc + (a.total_hours || 0), 0) || 0;
    const opCount = aircraft.data?.filter(a => a.status === 'Operativo').length || 0;

    // 3. Lógica de Gráfico (6 meses)
    const monthlyCounts = [0, 0, 0, 0, 0, 0];
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const last6MonthsLabels = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      last6MonthsLabels.push(monthNames[d.getMonth()]);
      
      flights.data?.forEach(f => {
        const fDate = new Date(f.flight_date);
        if (fDate.getMonth() === d.getMonth() && fDate.getFullYear() === d.getFullYear()) {
          monthlyCounts[5 - i]++;
        }
      });
    }

    // 4. Lógica de Alertas
    const alerts = [];
    const thirtyDaysOut = new Date();
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
    
    pilots.data?.forEach(p => {
      if (p.medical_expiry && new Date(p.medical_expiry) < thirtyDaysOut) {
        alerts.push({ id: p.id, type: 'medical', title: p.name, desc: 'Médico por vencer', val: p.medical_expiry });
      }
    });

    return NextResponse.json({
      stats: {
        hours: totalHours.toFixed(1),
        operational: `${opCount}/${aircraft.data?.length || 0}`,
        pilots: pilots.data?.length || 0,
        smsAlerts: alerts.length
      },
      chart: {
        labels: last6MonthsLabels,
        data: monthlyCounts
      },
      recentActivity: flights.data?.slice(0, 5) || [],
      criticalAlerts: alerts.slice(0, 3)
    });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}