'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: { hours: 0, fleet: "0/0", pilots: 0, alerts: 0 },
    monthlyActivity: [0, 0, 0, 0, 0, 0], // Últimos 6 meses
    missionDistribution: {}
  });

  useEffect(() => {
    async function fetchRealData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Obtener Aeronaves y Horas
        const { data: aircraft } = await supabase.from('aircraft').select('total_hours, status').eq('owner_id', user.id);
        const totalH = aircraft?.reduce((acc, a) => acc + (a.total_hours || 0), 0) || 0;
        const operational = aircraft?.filter(a => a.status === 'Operativo').length || 0;

        // 2. Obtener Vuelos para Gráficos
        const { data: flights } = await supabase
          .from('flights')
          .select('flight_date, mission_type')
          .eq('owner_id', user.id);

        // --- LÓGICA DE GRÁFICO DE BARRAS (Últimos 6 meses) ---
        const months = [0, 0, 0, 0, 0, 0];
        const now = new Date();
        flights?.forEach(f => {
          const fDate = new Date(f.flight_date);
          const monthDiff = (now.getFullYear() - fDate.getFullYear()) * 12 + (now.getMonth() - fDate.getMonth());
          if (monthDiff >= 0 && monthDiff < 6) {
            months[5 - monthDiff]++; // Invertimos para que el actual sea el último
          }
        });

        // --- LÓGICA DE DISTRIBUCIÓN DE MISIONES ---
        const missions = {};
        flights?.forEach(f => {
          missions[f.mission_type] = (missions[f.mission_type] || 0) + 1;
        });
        // Convertir a porcentajes
        const totalFlights = flights?.length || 1;
        Object.keys(missions).forEach(key => {
          missions[key] = Math.round((missions[key] / totalFlights) * 100);
        });

        setData({
          stats: {
            hours: totalH.toFixed(1),
            fleet: `${operational}/${aircraft?.length || 0}`,
            pilots: 0, // Aquí podrías añadir el conteo de la tabla pilots
            alerts: 0
          },
          monthlyActivity: months,
          missionDistribution: missions
        });
      } catch (error) {
        console.error("Error cargando estadísticas reales:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchRealData();
  }, []);

  if (loading) return <div className="p-10 animate-pulse font-black text-slate-400">CALCULANDO MÉTRICAS REALES...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-left">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Total Horas" value={`${data.stats.hours}h`} trend="Real" />
        <KPICard title="Flota Operativa" value={data.stats.fleet} subtitle="Disponibles" />
        <KPICard title="Actividad Mensual" value={data.monthlyActivity[5]} subtitle="Vuelos este mes" />
        <KPICard title="Alertas" value="0" warning={false} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Gráfico de Barras Real */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-8">Volumen de Vuelos (6 Meses)</h3>
          <div className="h-48 w-full flex items-end gap-4 px-2">
            {data.monthlyActivity.map((count, i) => {
              const height = count > 0 ? Math.min((count / Math.max(...data.monthlyActivity)) * 100, 100) : 5;
              return (
                <div key={i} className="group relative flex-1">
                  <div style={{ height: `${height}%` }} className="bg-[#ec5b13]/20 group-hover:bg-[#ec5b13] transition-all rounded-t-xl cursor-help">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {count} vuelos
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Misiones Reales */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-8">Especialidad de Misión</h3>
          <div className="space-y-6">
            {Object.keys(data.missionDistribution).length > 0 ? (
              Object.entries(data.missionDistribution).map(([name, percent]) => (
                <div key={name} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-500">{name}</span>
                    <span className="text-[#ec5b13]">{percent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div style={{ width: `${percent}%` }} className="bg-[#ec5b13] h-full transition-all duration-1000"></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic py-10 text-center uppercase font-bold">Sin datos de misión</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, trend, subtitle, warning }) {
  return (
    <div className={`bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm ${warning ? 'border-orange-500 bg-orange-50' : ''}`}>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
      <div className="flex items-baseline justify-between">
        <span className="text-3xl font-black text-slate-900">{value}</span>
        {trend && <span className="text-emerald-500 text-[10px] font-black uppercase">{trend}</span>}
        {subtitle && <span className="text-slate-400 text-[10px] font-bold uppercase">{subtitle}</span>}
      </div>
    </div>
  );
}