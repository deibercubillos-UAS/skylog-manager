'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: { hours: 0, fleet: "0/0", pilots: 0, alerts: 0 },
    recentFlights: [],
    missionStats: { photogrammetry: 0, inspection: 0, mapping: 0, rescue: 0 }
  });

  useEffect(() => {
    async function getDashboardData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. KPI: Aeronaves y Horas
        const { data: aircraft } = await supabase
          .from('aircraft')
          .select('total_hours, status')
          .eq('owner_id', user.id);

        const totalH = aircraft?.reduce((acc, a) => acc + (a.total_hours || 0), 0) || 0;
        const operational = aircraft?.filter(a => a.status === 'Operativo').length || 0;

        // 2. KPI: Pilotos
        const { count: pilotsCount } = await supabase
          .from('pilots')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', user.id);

        // 3. Vuelos Recientes y Estadísticas de Misión
        const { data: flights } = await supabase
          .from('flights')
          .select('*, pilots(name), aircraft(model)')
          .eq('owner_id', user.id)
          .order('flight_date', { ascending: false })
          .limit(5);

        // 4. Conteo de misiones (Simulado basado en registros)
        const missionCounts = { photogrammetry: 45, inspection: 30, mapping: 15, rescue: 10 };

        setData({
          stats: {
            hours: totalH.toFixed(1),
            fleet: `${operational}/${aircraft?.length || 0}`,
            pilots: pilotsCount || 0,
            alerts: 2 // Ejemplo estático de alertas de mantenimiento
          },
          recentFlights: flights || [],
          missionStats: missionCounts
        });
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    getDashboardData();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ec5b13]"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-left">
      
      {/* SECCIÓN 1: KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Total Horas" value={`${data.stats.hours}h`} trend="+5.2%" />
        <KPICard title="Flota Operativa" value={data.stats.fleet} subtitle="Aeronaves Listas" />
        <KPICard title="Pilotos" value={data.stats.pilots} subtitle="Comandantes Activos" />
        <KPICard title="Alertas" value={data.stats.alerts} warning={data.stats.alerts > 0} />
      </div>

      {/* SECCIÓN 2: GRÁFICOS */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Gráfico de Barras: Actividad Mensual */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-black text-slate-800 mb-6 uppercase text-[10px] tracking-widest">Actividad Mensual (Horas)</h3>
          <div className="h-48 w-full flex items-end gap-3 px-2">
            {[40, 65, 50, 85, 70, 95, 60].map((h, i) => (
              <div key={i} className="group relative flex-1">
                <div style={{ height: `${h}%` }} className="bg-[#ec5b13]/20 group-hover:bg-[#ec5b13] transition-all rounded-t-lg"></div>
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400">M{i+1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Distribución de Misiones */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-black text-slate-800 mb-6 uppercase text-[10px] tracking-widest">Tipos de Misión</h3>
          <div className="space-y-5">
            <ProgressBar label="Fotogrametría" percent={data.missionStats.photogrammetry} color="bg-[#ec5b13]" />
            <ProgressBar label="Inspección" percent={data.missionStats.inspection} color="bg-[#1A202C]" />
            <ProgressBar label="Mapeo" percent={data.missionStats.mapping} color="bg-emerald-500" />
            <ProgressBar label="Rescate" percent={data.missionStats.rescue} color="bg-blue-500" />
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: TABLA DE VUELOS RECIENTES */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Actividad Reciente</h3>
          <button className="text-[10px] font-bold text-[#ec5b13] hover:underline uppercase">Ver Bitácora Completa</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-tighter">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Piloto</th>
                <th className="px-6 py-4">Aeronave</th>
                <th className="px-6 py-4">Misión</th>
                <th className="px-6 py-4 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {data.recentFlights.length > 0 ? (
                data.recentFlights.map((flight) => (
                  <tr key={flight.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-600">{flight.flight_date}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{flight.pilots?.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-slate-500">{flight.aircraft?.model || 'Desconocido'}</td>
                    <td className="px-6 py-4 text-slate-500">{flight.mission_type}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase">Completado</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400 italic">No hay vuelos registrados aún.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// COMPONENTES AUXILIARES
function KPICard({ title, value, trend, subtitle, warning }) {
  return (
    <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md ${warning ? 'border-orange-500 bg-orange-50' : ''}`}>
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
      <div className="flex items-baseline justify-between">
        <span className={`text-3xl font-black ${warning ? 'text-orange-600' : 'text-slate-900'}`}>{value}</span>
        {trend && <span className="text-emerald-500 text-xs font-bold uppercase">{trend}</span>}
        {subtitle && <span className="text-slate-400 text-xs font-medium">{subtitle}</span>}
      </div>
    </div>
  );
}

function ProgressBar({ label, percent, color }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
        <span className="text-slate-500">{label}</span>
        <span className="text-slate-900">{percent}%</span>
      </div>
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div className={`${color} h-full transition-all duration-1000`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}