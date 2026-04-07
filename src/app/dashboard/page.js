'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadDashboard() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch(`/api/dashboard`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const result = await res.json();
            setData(result);
            setLoading(false);
        }
        loadDashboard();
    }, []);

    if (loading) return <div className="p-20 text-center font-black text-slate-300 uppercase animate-pulse">Iniciando Centro de Control...</div>;

    const maxVal = Math.max(...(data?.chart?.data || []), 1);

    return (
        <div className="space-y-8 animate-in fade-in duration-700 text-left pb-10">
            
            {/* KPIs SUPERIORES */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
                <KPICard title="Horas de Vuelo" value={`${data?.stats?.hours}h`} icon="timer" />
                <KPICard title="Flota Lista" value={data?.stats?.operational} icon="precision_manufacturing" />
                <KPICard title="Tripulación" value={data?.stats?.pilots} icon="group" />
                <KPICard title="Alertas" value={data?.stats?.alertsCount} icon="gavel" warning={data?.stats?.alertsCount > 0} />
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* GRÁFICO DE ACTIVIDAD (6 MESES) */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-[400px]">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 mb-10 tracking-[0.2em]">Volumen de Misiones (Semestre)</h3>
                    <div className="flex-1 flex items-end gap-4 px-2">
                        {data?.chart?.data.map((count, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-3 group relative">
                                <div 
                                    style={{ height: `${(count / maxVal) * 90}%`, minHeight: count > 0 ? '10%' : '4px' }} 
                                    className={`w-full max-w-[50px] rounded-t-xl transition-all duration-1000 ${count > 0 ? 'bg-[#ec5b13] shadow-lg' : 'bg-slate-100'}`}
                                >
                                    {count > 0 && (
                                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-black text-[#ec5b13] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                            {count} Vuelos
                                        </span>
                                    )}
                                </div>
                                <span className="text-[9px] font-black text-slate-400 uppercase">{data?.chart?.labels[i]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CENTRO DE ALERTAS DE CUMPLIMIENTO */}
                <div className="bg-[#1A202C] p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col h-[400px]">
                    <h3 className="text-xs font-black uppercase text-[#ec5b13] mb-6 border-b border-white/5 pb-4 tracking-widest">Alertas de Compliance</h3>
                    <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {data?.alerts?.length > 0 ? data.alerts.map(alert => (
                            <div key={alert.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-start gap-3 hover:bg-white/10 transition-all text-left">
                                <span className={`material-symbols-outlined text-lg ${alert.type === 'critical' ? 'text-red-500' : 'text-orange-500'}`}>
                                    {alert.desc.includes('Médico') ? 'medical_services' : 'build'}
                                </span>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-tight text-slate-200">{alert.title}</p>
                                    <p className="text-[9px] text-slate-400 mt-1 font-medium italic">{alert.desc}</p>
                                    <p className={`text-[10px] font-bold mt-2 font-mono uppercase ${alert.type === 'critical' ? 'text-red-400' : 'text-orange-400'}`}>{alert.val}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-30">
                                <span className="material-symbols-outlined text-5xl">verified</span>
                                <p className="text-[9px] font-black uppercase tracking-[0.2em]">Sistemas en Regla</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* TABLA RESUMEN */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden text-left">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Actividad Reciente</h3>
                    <Link href="/dashboard/logbook" className="text-[10px] font-black text-[#ec5b13] uppercase hover:underline">Ver Historial Completo</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                <th className="px-8 py-4">ID Misión</th>
                                <th className="px-8 py-4">Tripulante</th>
                                <th className="px-8 py-4">Equipo</th>
                                <th className="px-8 py-4 text-right">Estatus</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data?.recentActivity?.map(f => (
                                <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5 text-xs font-black text-[#ec5b13] font-mono">{f.flight_number}</td>
                                    <td className="px-8 py-5 text-sm font-bold text-slate-700">{f.pilots?.name}</td>
                                    <td className="px-8 py-5 text-[10px] text-slate-500 font-bold uppercase">{f.aircraft?.model}</td>
                                    <td className="px-8 py-5 text-right">
                                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase">Realizado</span>
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
            <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{title}</span>
                <span className={`material-symbols-outlined ${warning ? 'text-red-500' : 'text-[#ec5b13]'}`}>{icon}</span>
            </div>
            <span className="text-4xl font-black text-slate-900 tracking-tighter">{value}</span>
        </div>
    );
}