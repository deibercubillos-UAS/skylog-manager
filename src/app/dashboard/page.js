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
            const res = await fetch(`/api/dashboard?userId=${session.user.id}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const result = await res.json();
            setData(result);
            setLoading(false);
        }
        loadDashboard();
    }, []);

    if (loading) return <div className="p-20 text-center font-black text-slate-300 uppercase animate-pulse">Cargando Mando Central...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-700 text-left pb-10">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200">
                    <p className="text-[10px] font-black uppercase text-slate-400">Horas Totales</p>
                    <p className="text-4xl font-black text-slate-900">{data?.stats?.hours}h</p>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200">
                    <p className="text-[10px] font-black uppercase text-slate-400">Flota Lista</p>
                    <p className="text-4xl font-black text-slate-900">{data?.stats?.operational}</p>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200">
                    <p className="text-[10px] font-black uppercase text-slate-400">Operadores</p>
                    <p className="text-4xl font-black text-slate-900">{data?.stats?.pilots}</p>
                </div>
            </div>

            {/* TABLA HISTORIAL OPERATIVO */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden text-left">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Historial Operativo (Últimos Vuelos)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                <th className="px-8 py-4">ID Misión</th>
                                <th className="px-8 py-4">Tripulante</th>
                                <th className="px-8 py-4">Equipo UAS</th>
                                <th className="px-8 py-4">Batería S/N</th> {/* <-- NUEVA COLUMNA */}
                                <th className="px-8 py-4 text-right">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data?.recentActivity?.map(f => (
                                <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5 text-xs font-black text-[#ec5b13] font-mono">{f.flight_number}</td>
                                    <td className="px-8 py-5 text-sm font-bold text-slate-700">{f.pilots?.name}</td>
                                    <td className="px-8 py-5 text-[10px] text-slate-500 font-bold uppercase">{f.aircraft?.model}</td>
                                    <td className="px-8 py-5">
                                        <span className="text-[10px] font-mono font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">
                                            {f.battery_logs?.[0]?.battery_sn || 'N/R'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">Completado</span>
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