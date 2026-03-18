'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) throw new Error("Error en la respuesta del servidor");
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Falla al cargar Dashboard:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">Sincronizando BitaFly...</div>;

  if (error || !data) return (
    <div className="p-20 text-center text-red-500 font-bold uppercase">
      ⚠️ Error de conexión con el centro de mando. Reintenta en unos momentos.
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 text-left">
      
      {/* KPIs con protección de datos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Horas Totales" value={`${data?.stats?.hours || 0}h`} icon="timer" />
        <KPICard title="Flota" value={data?.stats?.operational || '0/0'} icon="precision_manufacturing" />
        <KPICard title="Tripulación" value={data?.stats?.pilots || 0} icon="group" />
        <KPICard title="Alertas" value={data?.stats?.smsAlerts || 0} icon="gavel" warning={data?.stats?.smsAlerts > 0} />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Gráfico Protegido */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-[10px] font-black uppercase text-slate-400 mb-8">Actividad Reciente</h3>
          <div className="h-48 flex items-end gap-4 px-2">
            {(data?.chart?.data || [0,0,0,0,0,0]).map((count, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  style={{ height: `${count > 0 ? (count / (Math.max(...data.chart.data) || 1)) * 100 : 5}%` }} 
                  className="w-full bg-[#ec5b13] rounded-t-xl opacity-80 transition-all duration-1000"
                ></div>
                <span className="text-[9px] font-bold text-slate-400 uppercase">{data?.chart?.labels?.[i] || '---'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas Protegidas */}
        <div className="bg-[#1A202C] p-8 rounded-[2.5rem] text-white shadow-xl">
          <h3 className="text-xs font-black uppercase text-[#ec5b13] mb-6 border-b border-white/5 pb-4">Alertas Críticas</h3>
          <div className="space-y-4">
            {data?.criticalAlerts?.length > 0 ? data.criticalAlerts.map(alert => (
              <div key={alert.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 text-[10px] font-black uppercase tracking-tighter">
                {alert.title}: {alert.desc}
              </div>
            )) : (
              <p className="text-slate-500 text-[10px] uppercase font-black py-10 text-center">Sin alertas pendientes</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, warning }) {
  return (
    <div className={`bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${warning ? 'ring-2 ring-red-500/20 bg-red-50/10' : ''}`}>
      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{title}</span>
      <div className="flex justify-between items-end mt-2">
        <span className={`text-3xl font-black ${warning ? 'text-red-600' : 'text-slate-900'}`}>{value}</span>
        <span className={`material-symbols-outlined ${warning ? 'text-red-500' : 'text-[#ec5b13]'}`}>{icon}</span>
      </div>
    </div>
  );
}