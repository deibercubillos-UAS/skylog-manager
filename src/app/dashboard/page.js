'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDashboard() {
            try {
                const res = await fetch('/api/dashboard');
                const result = await res.json();
                setData(result);
            } catch (e) {
                console.error("Dashboard fetch error");
            } finally {
                setLoading(false);
            }
        }
        fetchDashboard();
    }, []);

    if (loading) return <div className="p-20 text-center font-black animate-pulse uppercase text-slate-400">Sincronizando Torre de Control...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-700 text-left">
            {/* KPIs PRINCIPALES */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KPICard title="Horas de Vuelo" value={`${data?.stats?.hours || '0.0'}h`} icon="timer" />
                <KPICard title="Flota Lista" value={data?.stats?.fleetCount || '0'} icon="precision_manufacturing" />
                <KPICard title="Tripulación" value={data?.stats?.pilotCount || '0'} icon="group" />
                <KPICard title="Alertas" value={data?.stats?.alerts || '0'} icon="gavel" warning={data?.stats?.alerts > 0} />
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* GRÁFICO PLACEHOLDER (Para no romper el build con librerías pesadas) */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-[400px] justify-center items-center">
                    <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em]">Volumen de Misiones</p>
                    <div className="w-full flex items-end justify-around h-48 mt-10">
                        {[40, 70, 45, 90, 65, 80].map((h, i) => (
                            <div key={i} style={{ height: `${h}%` }} className="w-8 bg-orange-500/10 border-t-4 border-orange-500 rounded-t-lg"></div>
                        ))}
                    </div>
                </div>

                <div className="bg-[#1A202C] p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col h-[400px]">
                    <h3 className="text-xs font-black uppercase text-[#ec5b13] mb-6 tracking-widest">Alertas de Compliance</h3>
                    <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                        <span className="material-symbols-outlined text-5xl">verified</span>
                        <p className="text-[9px] font-black uppercase mt-4">Sistemas en Regla</p>
                    </div>
                </div>
            </div>

            {/* ACTIVIDAD RECIENTE */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="font-black text-xs uppercase text-slate-400">Actividad Reciente</h3>
                    <Link href="/dashboard/logbook" className="text-[10px] font-black text-orange-600 uppercase underline">Ver todo</Link>
                </div>
                <table className="w-full text-left">
                    <tbody className="divide-y">
                        {data?.recentActivity?.length > 0 ? data.recentActivity.map(f => (
                            <tr key={f.id} className="hover:bg-slate-50 transition-all">
                                <td className="p-4 text-xs font-bold">{f.flight_number}</td>
                                <td className="p-4 text-xs">{f.pilots?.name}</td>
                                <td className="p-4 text-[10px] font-black uppercase text-slate-400">{f.aircraft?.model}</td>
                                <td className="p-4 text-right"><span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-bold">EXITOSO</span></td>
                            </tr>
                        )) : (
                            <tr><td colSpan="4" className="p-10 text-center text-slate-400 text-xs italic">Sin actividad registrada en este periodo.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function KPICard({ title, value, icon, warning }) {
    return (
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{title}</span>
                <span className={`material-symbols-outlined ${warning ? 'text-red-500' : 'text-[#ec5b13]'}`}>{icon}</span>
            </div>
            <span className="text-4xl font-black text-slate-900 tracking-tighter">{value}</span>
        </div>
    );
}