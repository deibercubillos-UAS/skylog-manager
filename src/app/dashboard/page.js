'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const response = await fetch('/api/dashboard');
      const result = await response.json();
      if (!result.error) setData(result);
      setLoading(false);
    }
    loadDashboard();
  }, []);

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300">CARGANDO BITAFLY...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 text-left">
      {/* KPIs consumiendo data.stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Horas Totales" value={`${data.stats.hours}h`} icon="timer" />
        <KPICard title="Flota" value={data.stats.operational} icon="precision_manufacturing" />
        <KPICard title="Pilotos" value={data.stats.pilots} icon="group" />
        <KPICard title="Alertas" value={data.stats.smsAlerts} icon="gavel" warning={data.stats.smsAlerts > 0} />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Gráfico usando data.chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h3 className="text-[10px] font-black uppercase text-slate-400 mb-8">Volumen 6 Meses</h3>
          <div className="h-48 flex items-end gap-4">
            {data.chart.data.map((count, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  style={{ height: `${(count / (Math.max(...data.chart.data) || 1)) * 100}%`, minHeight: '4px' }} 
                  className="w-full bg-[#ec5b13] rounded-t-xl opacity-80"
                ></div>
                <span className="text-[9px] font-bold text-slate-400">{data.chart.labels[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas usando data.criticalAlerts */}
        <div className="bg-[#1A202C] p-8 rounded-[2.5rem] text-white">
          <h3 className="text-xs font-black uppercase text-[#ec5b13] mb-6">Alertas</h3>
          <div className="space-y-4">
            {data.criticalAlerts.map(alert => (
              <div key={alert.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 text-xs font-bold uppercase">
                {alert.title}: {alert.desc}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, warning }) {
  return (
    <div className={`bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm text-left`}>
      <span className="text-[10px] font-black uppercase text-slate-400">{title}</span>
      <div className="flex justify-between items-end mt-2">
        <span className="text-3xl font-black">{value}</span>
        <span className={`material-symbols-outlined ${warning ? 'text-red-500' : 'text-[#ec5b13]'}`}>{icon}</span>
      </div>
    </div>
  );
}