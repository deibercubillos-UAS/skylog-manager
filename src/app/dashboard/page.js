'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const response = await fetch(`/api/dashboard?userId=${user.id}`);
      const result = await response.json();
      if (!result.error) setData(result);
      setLoading(false);
    }
    loadDashboard();
  }, []);

  if (loading) return <div className="p-20 text-center font-black text-slate-300 uppercase tracking-widest animate-pulse">Sincronizando Mando...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 text-left pb-10">
      
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
        <KPICard title="Horas Totales" value={`${data?.stats?.hours || 0}h`} icon="timer" />
        <KPICard title="Flota Operativa" value={data?.stats?.operational || '0/0'} icon="precision_manufacturing" />
        <KPICard title="Tripulación" value={data?.stats?.pilots || 0} icon="group" />
        <KPICard title="Alertas" value={data?.stats?.smsAlerts || 0} icon="gavel" warning={data?.stats?.smsAlerts > 0} />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* GRÁFICO */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-[10px] font-black uppercase text-slate-400 mb-8 tracking-widest">Actividad de Misiones (6 meses)</h3>
          <div className="h-48 flex items-end gap-4 px-2">
            {data?.chart?.data.map((count, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div 
                  style={{ height: `${count > 0 ? (count / (Math.max(...data.chart.data) || 1)) * 100 : 5}%` }} 
                  className="w-full bg-[#ec5b13] rounded-t-xl opacity-80 group-hover:opacity-100 transition-all duration-500 shadow-sm"
                ></div>
                <span className="text-[9px] font-black text-slate-400 uppercase">{data?.chart?.labels[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ALERTAS */}
        <div className="bg-[#1A202C] p-8 rounded-[2.5rem] text-white shadow-xl">
          <h3 className="text-xs font-black uppercase text-[#ec5b13] mb-6 border-b border-white/5 pb-4 tracking-widest text-left">Centro de Alertas</h3>
          <div className="space-y-4">
            {data?.criticalAlerts?.length > 0 ? data.criticalAlerts.map(alert => (
              <div key={alert.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 text-left">
                <p className="text-[10px] font-black uppercase text-[#ec5b13]">{alert.title}</p>
                <p className="text-xs font-bold text-slate-300 mt-1">{alert.desc}</p>
              </div>
            )) : (
              <p className="text-slate-500 text-[10px] font-black uppercase py-10 text-center">Sistemas en estado óptimo</p>
            )}
          </div>
        </div>
      </div>

      {/* ACTIVIDAD RECIENTE */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest text-left">Últimas Operaciones</h3>
          <Link href="/dashboard/logbook" className="text-[10px] font-black text-[#ec5b13] uppercase hover:underline tracking-widest">Bitácora Completa</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-4">ID Vuelo</th>
                <th className="px-8 py-4">Tripulación</th>
                <th className="px-8 py-4">Aeronave</th>
                <th className="px-8 py-4 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.recentActivity.map(f => (
                <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5 text-xs font-black text-[#ec5b13] font-mono">{f.flight_number}</td>
                  <td className="px-8 py-5 text-sm font-bold text-slate-700">{f.pilots?.name}</td>
                  <td className="px-8 py-5 text-xs text-slate-500 font-medium uppercase">{f.aircraft?.model}</td>
                  <td className="px-8 py-5 text-right">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase">Cerrado</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, warning }) {
  return (
    <div className={`bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all ${warning ? 'ring-2 ring-red-500/20' : ''}`}>
      <div className="flex justify-between items-start">
         <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{title}</span>
         <span className={`material-symbols-outlined ${warning ? 'text-red-500' : 'text-[#ec5b13]'}`}>{icon}</span>
      </div>
      <span className="text-4xl font-black tracking-tighter mt-4 text-slate-900">{value}</span>
    </div>
  );
}