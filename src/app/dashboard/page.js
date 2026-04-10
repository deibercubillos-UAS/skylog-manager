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

    if (loading) return <div className="p-20 text-center font-black animate-pulse uppercase text-slate-400 tracking-widest">Sincronizando Torre de Control...</div>;

    // LÓGICA DE ESCALADO DINÁMICO: Buscamos el valor más alto del semestre
    const counts = data?.chart?.map(m => m.count) || [0];
    const maxVal = Math.max(...counts, 1); // Evitamos división por cero

    return (
        <div className="space-y-10 animate-in fade-in duration-700 text-left pb-20">
            {/* KPIs PRINCIPALES (Responsivo: 2 columnas en mobile, 4 en PC) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <KPICard title="Horas de Vuelo" value={`${data?.stats?.hours}h`} icon="timer" color="text-slate-900" />
                <KPICard title="Flota Lista" value={data?.stats?.fleetCount} icon="precision_manufacturing" color="text-orange-500" />
                <KPICard title="Tripulación" value={data?.stats?.pilotCount} icon="group" color="text-slate-900" />
                <KPICard title="Alertas" value={data?.stats?.alertsCount} icon="warning" warning={data?.stats?.alertsCount > 0} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* GRÁFICO DINÁMICO */}
                <div className="lg:col-span-2 bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-[400px] md:h-[450px]">
                    <div className="flex justify-between items-start mb-12">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Actividad Mensual</h3>
                        <span className="text-[9px] font-black bg-emerald-50 px-2 py-1 rounded text-emerald-600">ESCALA DINÁMICA</span>
                    </div>
                    <div className="flex-1 flex items-end justify-around gap-2 md:gap-4 px-2">
                        {data?.chart?.map((m, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-4 md:gap-6 group relative">
                                {/* Altura calculada proporcionalmente al maxVal */}
                                <div 
                                    style={{ height: `${(m.count / maxVal) * 100}%`, minHeight: m.count > 0 ? '8%' : '4px' }} 
                                    className="w-full max-w-[45px] bg-orange-500/10 border-t-4 border-orange-500 rounded-t-xl transition-all duration-1000 group-hover:bg-orange-600/40 group-hover:shadow-lg"
                                ></div>
                                <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase">{m.label}</span>
                                {m.count > 0 && (
                                    <span className="absolute -top-8 text-[11px] font-black text-orange-600 animate-in zoom-in duration-500">
                                        {m.count}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ALERTAS DE COMPLIANCE */}
                <div className="bg-[#1A202C] p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-white flex flex-col h-[400px] md:h-[450px] border border-white/5">
                    <h3 className="text-xs font-black uppercase text-orange-500 mb-8 tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">gavel</span> Control Aeronáutico
                    </h3>
                    <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                        {data?.alerts && data.alerts.length > 0 ? data.alerts.map((a, i) => (
                            <div key={i} className="p-4 rounded-[1.5rem] border border-white/10 bg-white/5 flex items-start gap-4">
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
                                <p className="text-[10px] font-black uppercase mt-4 tracking-widest text-center">Sin novedades</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* BITÁCORA DE ACTIVIDAD RECIENTE (Restaurada) */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden text-left">
                <div className="p-6 md:p-8 border-b flex justify-between items-center bg-slate-50/30">
                    <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest">Actividad Reciente</h3>
                    <Link href="/dashboard/logbook" className="text-[10px] font-black text-orange-600 uppercase underline">Historial Completo</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-8 py-5">Referencia</th>
                                <th className="px-8 py-5">PIC (Piloto)</th>
                                <th className="px-8 py-5">UAS (Aeronave)</th>
                                <th className="px-8 py-5 text-right">Estatus</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data?.recentActivity?.length > 0 ? data.recentActivity.map(f => (
                                <tr key={f.id} className="hover:bg-slate-50 transition-all group">
                                    <td className="px-8 py-6 text-xs font-black font-mono text-orange-600">{f.flight_number || 'N/A'}</td>
                                    <td className="px-8 py-6 text-xs font-bold text-slate-700">{f.pilots?.name || 'Sistema'}</td>
                                    <td className="px-8 py-6 text-[10px] font-black uppercase text-slate-400">{f.aircraft?.model || 'N/R'}</td>
                                    <td className="px-8 py-6 text-right">
                                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">Registrado</span>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="4" className="p-10 text-center text-slate-400 text-xs italic font-bold">No hay vuelos registrados recientemente.</td></tr>
                            )}
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