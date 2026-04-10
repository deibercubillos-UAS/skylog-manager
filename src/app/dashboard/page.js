'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/dashboard').then(res => res.json()).then(result => {
            setData(result);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-20 text-center font-black animate-pulse uppercase text-slate-400 tracking-widest">AUTORIZANDO PANEL MAESTRO...</div>;

    const maxCount = Math.max(...(data?.chart?.map(m => m.count) || [1]), 1);

    return (
        <div className="space-y-10 animate-in fade-in duration-700 text-left pb-20">
            {/* KPIs PRINCIPALES */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                <KPICard title="Horas de Vuelo" value={`${data?.stats?.hours}h`} icon="timer" color="text-slate-900" />
                <KPICard title="Flota Lista" value={data?.stats?.fleetCount} icon="precision_manufacturing" color="text-orange-500" />
                <KPICard title="Tripulación" value={data?.stats?.pilotCount} icon="group" color="text-slate-900" />
                <KPICard title="Alertas" value={data?.stats?.alertsCount} icon="warning" warning={data?.stats?.alertsCount > 0} />
            </div>

            <div className="grid lg:grid-cols-3 gap-10">
                {/* GRÁFICO OPERATIVO */}
                <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-[450px]">
                    <div className="flex justify-between items-start mb-12">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Actividad Mensual</h3>
                        <span className="text-[9px] font-black bg-emerald-50 px-2 py-1 rounded text-emerald-600">SISTEMA ONLINE</span>
                    </div>
                    <div className="flex-1 flex items-end justify-around gap-4 px-4">
                        {data?.chart?.map((m, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-6 group relative">
                                <div 
                                style={{ height: `${(m.count / maxCount) * 100}%`, minHeight: m.count > 0 ? '8%' : '4px' }} 
                                className="w-full max-w-[45px] bg-orange-500/10 border-t-4 border-orange-500 rounded-t-xl transition-all duration-1000 group-hover:bg-orange-600/40"
                            ></div>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{m.label}</span>
                                {m.count > 0 && <span className="absolute -top-8 text-[11px] font-black text-orange-600">{m.count}</span>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* CENTRO DE COMPLIANCE */}
                <div className="bg-[#1A202C] p-10 rounded-[2.5rem] shadow-2xl text-white flex flex-col h-[450px] border border-white/5">
                    <h3 className="text-xs font-black uppercase text-orange-500 mb-8 tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">gavel</span> Control Aeronáutico
                    </h3>
                    <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                        {data?.alerts && data.alerts.length > 0 ? data.alerts.map((a, i) => (
                            <div key={i} className="p-5 rounded-[1.5rem] border border-white/10 bg-white/5 flex items-start gap-4">
                                <span className="material-symbols-outlined text-sm text-orange-500">priority_high</span>
                                <div>
                                    <p className="text-[11px] font-black leading-tight uppercase">{a.msg}</p>
                                    <p className="text-[9px] text-slate-500 font-bold mt-2 uppercase">{a.val}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-20">
                                <span className="material-symbols-outlined text-6xl">verified</span>
                                <p className="text-[10px] font-black uppercase mt-4 tracking-widest text-center leading-relaxed">Sin reportes<br/>de cumplimiento</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function KPICard({ title, value, icon, warning, color }) {
    return (
        <div className={`bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:-translate-y-1 ${warning ? 'ring-2 ring-red-500/30 bg-red-50/5' : ''}`}>
            <div className="flex justify-between items-start mb-2 md:mb-4">
                <span className="text-[7px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">{title}</span>
                <span className={`material-symbols-outlined text-sm md:text-2xl ${warning ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}>{icon}</span>
            </div>
            <span className={`text-xl md:text-4xl font-black tracking-tighter ${warning ? 'text-red-600' : color}`}>{value || 0}</span>
        </div>
    );
}