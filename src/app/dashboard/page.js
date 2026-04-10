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

    if (loading) return <div className="p-20 text-center font-black animate-pulse uppercase text-slate-400 tracking-widest">Sincronizando Mando...</div>;

    // LÓGICA DE ESCALADO MATEMÁTICO
    const counts = data?.chart?.map(m => m.count) || [0];
    const maxVal = Math.max(...counts, 1); 

    return (
        <div className="space-y-8 animate-in fade-in duration-700 text-left pb-10">
            {/* 1. KPIs SUPERIORES */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <KPICard title="Horas de Vuelo" value={`${data?.stats?.hours}h`} icon="timer" color="text-slate-900" />
                <KPICard title="Flota Lista" value={data?.stats?.fleetCount} icon="precision_manufacturing" color="text-orange-500" />
                <KPICard title="Tripulación" value={data?.stats?.pilotCount} icon="group" color="text-slate-900" />
                <KPICard title="Alertas" value={data?.stats?.alertsCount} icon="warning" warning={data?.stats?.alertsCount > 0} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 2. GRÁFICO DINÁMICO */}
                {/* CONTENEDOR DEL GRÁFICO MENSUAL */}
<div className="lg:col-span-2 bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-[400px]">
    <div className="flex justify-between items-start mb-10">
        <div>
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Actividad Mensual</h3>
            <p className="text-xs font-bold text-slate-900 mt-1">Vuelos totales: {data?.stats?.totalFlights}</p>
        </div>
        <span className="text-[9px] font-black bg-emerald-50 px-2 py-1 rounded text-emerald-600 uppercase">Datos Sincronizados</span>
    </div>
    
    <div className="flex-1 flex items-end justify-around gap-2 px-2 border-b border-slate-100 pb-4">
        {data?.chart?.map((m, i) => {
            // Buscamos el mes con más vuelos para escalar
            const maxCount = Math.max(...data.chart.map(x => x.count), 1);
            const barHeight = (m.count / maxCount) * 100;

            return (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group relative h-full justify-end">
                    {/* BARRA DINÁMICA CON PORCENTAJE REAL */}
                    <div 
                        className={`w-full max-w-[40px] rounded-t-lg transition-all duration-1000 ease-out shadow-sm ${m.count > 0 ? 'bg-orange-500' : 'bg-slate-50'}`}
                        style={{ height: m.count > 0 ? `${barHeight}%` : '4px' }}
                    >
                        {m.count > 0 && (
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                {m.count}
                            </div>
                        )}
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase">{m.label}</span>
                </div>
            );
        })}
    </div>
</div>
                {/* 3. ALERTAS DE COMPLIANCE */}
                <div className="bg-[#1A202C] p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-white flex flex-col h-[380px] md:h-[450px] border border-white/5">
                    <h3 className="text-xs font-black uppercase text-orange-500 mb-8 tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">gavel</span> Compliance
                    </h3>
                    <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                        {data?.alerts && data.alerts.length > 0 ? data.alerts.map((a, i) => (
                            <div key={i} className="p-4 rounded-2xl border border-white/10 bg-white/5 flex items-start gap-4">
                                <span className={`material-symbols-outlined text-sm ${a.type === 'CRÍTICO' ? 'text-red-500' : 'text-orange-500'}`}>
                                    {a.type === 'CRÍTICO' ? 'report' : 'notification_important'}
                                </span>
                                <div>
                                    <p className="text-[10px] font-black leading-tight uppercase">{a.msg}</p>
                                    <p className="text-[9px] text-slate-500 font-bold mt-2 uppercase">{a.val}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-20">
                                <span className="material-symbols-outlined text-6xl">verified</span>
                                <p className="text-[10px] font-black uppercase mt-4 tracking-widest text-center">Operación Segura</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 4. BITÁCORA RECIENTE (HIDDEN ON MOBILE) */}
            <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden text-left">
                <div className="p-8 border-b flex justify-between items-center bg-slate-50/30">
                    <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest">Actividad Reciente</h3>
                    <Link href="/dashboard/logbook" className="text-[10px] font-black text-orange-600 uppercase underline">Ver Historial</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-8 py-5">Referencia</th>
                                <th className="px-8 py-5">Tripulación (PIC)</th>
                                <th className="px-8 py-5">Aeronave (UAV)</th>
                                <th className="px-8 py-5 text-right">Estatus</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
    {data?.recentActivity?.map(f => (
        <tr key={f.id} className="hover:bg-slate-50 transition-all group">
            <td className="px-8 py-6 text-xs font-black font-mono text-orange-600">{f.flight_number || 'N/A'}</td>
            {/* AQUÍ ESTÁN LOS DATOS QUE FALTABAN */}
            <td className="px-8 py-6 text-xs font-bold text-slate-700">{f.pilots?.name || 'No registrado'}</td>
            <td className="px-8 py-6 text-[10px] font-black uppercase text-slate-400">{f.aircraft?.model || 'Desconocido'}</td>
            <td className="px-8 py-6 text-right">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase border border-emerald-100">Registrado</span>
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

function KPICard({ title, value, icon, warning, color }) {
    return (
        <div className={`bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:-translate-y-1 ${warning ? 'ring-2 ring-red-500/30 bg-red-50/5' : ''}`}>
            <div className="flex justify-between items-start mb-4">
                <span className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">{title}</span>
                <span className={`material-symbols-outlined text-xl md:text-2xl ${warning ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}>{icon}</span>
            </div>
            <span className={`text-2xl md:text-4xl font-black tracking-tighter ${warning ? 'text-red-600' : color}`}>{value || 0}</span>
        </div>
    );
}