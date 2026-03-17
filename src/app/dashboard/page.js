'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: { hours: 0, operational: 0, totalDrones: 0, pilots: 0, smsAlerts: 0 },
    chartData: [], // Ahora incluiremos el nombre del mes y el conteo
    missions: {},
    recentActivity: [],
    criticalAlerts: []
  });

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Aeronaves
        const { data: aircraft } = await supabase.from('aircraft').select('*').eq('owner_id', user.id);
        const totalH = aircraft?.reduce((acc, a) => acc + (a.total_hours || 0), 0) || 0;
        const opCount = aircraft?.filter(a => a.status === 'Operativo').length || 0;

        // 2. Pilotos
        const { data: pilots } = await supabase.from('pilots').select('*').eq('owner_id', user.id);
        
        // 3. Vuelos
        const { data: flights } = await supabase
          .from('flights')
          .select('*, pilots(name), aircraft(model)')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        // --- LÓGICA DE GRÁFICO DE BARRAS (Últimos 6 meses reales) ---
        const last6Months = [];
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          last6Months.push({
            monthName: monthNames[d.getMonth()],
            monthIdx: d.getMonth(),
            year: d.getFullYear(),
            count: 0
          });
        }

        flights?.forEach(f => {
          const fDate = new Date(f.flight_date);
          last6Months.forEach(m => {
            if (fDate.getMonth() === m.monthIdx && fDate.getFullYear() === m.year) {
              m.count++;
            }
          });
        });

        // --- ALERTAS ---
        const alerts = [];
        const thirtyDaysOut = new Date();
        thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
        
        pilots?.forEach(p => {
          if (p.medical_expiry && new Date(p.medical_expiry) < thirtyDaysOut) {
            alerts.push({ id: `p-${p.id}`, type: 'medical', title: p.name, desc: 'Médico por vencer', val: p.medical_expiry });
          }
        });

        setData({
          stats: {
            hours: totalH.toFixed(1),
            operational: opCount,
            totalDrones: aircraft?.length || 0,
            pilots: pilots?.length || 0,
            smsAlerts: alerts.length
          },
          chartData: last6Months,
          missions: {},
          recentActivity: flights?.slice(0, 5) || [],
          criticalAlerts: alerts.slice(0, 3)
        });

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">Sincronizando BitaFly...</div>;

  // Encontrar el valor máximo para escalar las barras
  const maxVuelos = Math.max(...data.chartData.map(m => m.count), 1);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 text-left pb-10">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Horas de Vuelo" value={`${data.stats.hours}h`} icon="timer" />
        <KPICard title="Flota Operativa" value={`${data.stats.operational}/${data.stats.totalDrones}`} icon="precision_manufacturing" />
        <KPICard title="Tripulación" value={data.stats.pilots} icon="group" />
        <KPICard title="Alertas Seguridad" value={data.stats.smsAlerts} icon="gavel" warning={data.stats.smsAlerts > 0} />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* GRÁFICO DE ACTIVIDAD CORREGIDO */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Volumen de Operaciones (6 meses)</h3>
            <span className="text-[9px] font-black bg-orange-50 text-[#ec5b13] px-3 py-1 rounded-full uppercase tracking-tighter">Historial de Misiones</span>
          </div>
          
          <div className="flex-1 flex items-end gap-4 h-56 px-2">
            {data.chartData.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                {/* La Barra */}
                <div className="w-full relative flex items-end justify-center h-48">
                  <div 
                    style={{ height: `${(m.count / maxVuelos) * 100}%`, minHeight: m.count > 0 ? '10%' : '2px' }} 
                    className={`w-full max-w-[40px] rounded-t-xl transition-all duration-1000 shadow-sm ${m.count > 0 ? 'bg-[#ec5b13]' : 'bg-slate-100'}`}
                  >
                    {m.count > 0 && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity font-black">
                        {m.count}
                      </div>
                    )}
                  </div>
                </div>
                {/* Etiqueta del Mes */}
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">
                  {m.monthName}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ALERTAS CRÍTICAS */}
        <div className="bg-[#1A202C] p-8 rounded-[2.5rem] shadow-xl text-white">
          <h3 className="text-xs font-black uppercase text-[#ec5b13] tracking-widest mb-6 border-b border-white/5 pb-4">Centro de Alertas</h3>
          <div className="space-y-4">
            {data.criticalAlerts.length > 0 ? data.criticalAlerts.map(alert => (
              <div key={alert.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-start gap-3">
                <span className="material-symbols-outlined text-orange-500 text-lg">
                  {alert.type === 'medical' ? 'medical_services' : 'build'}
                </span>
                <div>
                  <p className="text-xs font-black uppercase leading-tight">{alert.title}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{alert.desc}</p>
                  <p className="text-[10px] text-orange-400 font-bold mt-2 font-mono">{alert.val}</p>
                </div>
              </div>
            )) : (
              <div className="py-14 text-center space-y-4">
                <div className="size-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-emerald-500">done_all</span>
                </div>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Flota en estado Óptimo</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABLA ACTIVIDAD */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Actividad Reciente</h3>
          <Link href="/dashboard/logbook" className="text-[10px] font-black text-[#ec5b13] uppercase hover:underline">Ver Bitácora</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                <th className="px-8 py-4">ID</th>
                <th className="px-8 py-4">Tripulación</th>
                <th className="px-8 py-4">Aeronave</th>
                <th className="px-8 py-4 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recentActivity.map(f => (
                <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5 text-xs font-black text-[#ec5b13] font-mono">{f.flight_number}</td>
                  <td className="px-8 py-5 text-sm font-bold text-slate-700">{f.pilots?.name}</td>
                  <td className="px-8 py-5 text-xs text-slate-500">{f.aircraft?.model}</td>
                  <td className="px-8 py-5 text-right">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase">
                      Cerrado
                    </span>
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
    <div className={`bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${warning ? 'ring-2 ring-red-500/20 bg-red-50/30' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-tight">{title}</span>
        <span className={`material-symbols-outlined ${warning ? 'text-red-500' : 'text-[#ec5b13]'}`}>{icon}</span>
      </div>
      <span className={`text-4xl font-black tracking-tighter ${warning ? 'text-red-600' : 'text-slate-900'}`}>{value}</span>
    </div>
  );
}