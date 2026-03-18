'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        // 1. Obtener la sesión actual para sacar el token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // 2. Llamar a la API enviando el ID y el Token en el Header
        const response = await fetch(`/api/dashboard?userId=${session.user.id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        const result = await response.json();
        if (!result.error) setData(result);
      } catch (err) {
        console.error("Error cargando datos:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) return <div className="p-20 text-center font-black text-slate-300 animate-pulse uppercase tracking-[0.3em]">Sincronizando BitaFly...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 text-left pb-10">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Horas Totales" value={`${data?.stats?.hours || 0}h`} icon="timer" />
        <KPICard title="Flota" value={data?.stats?.operational || '0/0'} icon="precision_manufacturing" />
        <KPICard title="Tripulación" value={data?.stats?.pilots || 0} icon="group" />
        <KPICard title="Alertas" value={data?.stats?.smsAlerts || 0} icon="gavel" />
      </div>

      {/* Actividad Reciente */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Últimos Vuelos</h3>
          <Link href="/dashboard/logbook" className="text-[10px] font-black text-[#ec5b13] uppercase hover:underline">Ver Todo</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-4">ID</th>
                <th className="px-8 py-4">Piloto</th>
                <th className="px-8 py-4">Aeronave</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.recentActivity?.map(f => (
                <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5 text-xs font-black text-[#ec5b13] font-mono">{f.flight_number}</td>
                  <td className="px-8 py-5 text-sm font-bold text-slate-700">{f.pilots?.name}</td>
                  <td className="px-8 py-5 text-xs text-slate-500 font-bold uppercase">{f.aircraft?.model}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon }) {
  return (
    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{title}</span>
        <span className="material-symbols-outlined text-[#ec5b13]">{icon}</span>
      </div>
      <span className="text-4xl font-black text-slate-900 tracking-tighter">{value}</span>
    </div>
  );
}