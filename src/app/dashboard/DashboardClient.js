'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function DashboardClient({ initialData, userProfile }) {
    const [data] = useState(initialData);
    const firstName = userProfile?.full_name?.split(' ')[0] || 'Operador';

    const counts = data?.chart?.map(m => m.count) || [0];
    const maxVal = Math.max(...counts, 1);

    // Tendencia de vuelos: mes actual vs mes anterior (últimas 2 entradas del chart)
    const lastTwo = counts.slice(-2);
    const flightTrend = lastTwo.length === 2 && lastTwo[0] > 0
        ? Math.round(((lastTwo[1] - lastTwo[0]) / lastTwo[0]) * 100)
        : null;

    return (
        <div className="space-y-8 animate-in fade-in duration-700 text-left pb-10">

            {/* SALUDO */}
            <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800">
                    Bienvenido, <span className="text-orange-500">{firstName}</span>
                </h2>
                <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wider">
                    {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            {/* 1. KPIs SUPERIORES */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <KPICard title="Horas de Vuelo" value={`${data?.stats?.hours || '0.0'}h`} icon="timer" color="text-slate-900" trend={flightTrend} />
                <KPICard title="Flota Lista" value={data?.stats?.fleetCount || 0} icon="precision_manufacturing" color="text-orange-500" />
                <KPICard title="Tripulación" value={data?.stats?.pilotCount || 0} icon="group" color="text-slate-900" />
                <KPICard title="Alertas" value={data?.stats?.alertsCount || 0} icon="warning" warning={(data?.stats?.alertsCount || 0) > 0} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 2. GRÁFICO DINÁMICO POR MESES */}
                <div className="lg:col-span-2 bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-[380px] md:h-[450px]">
                    <div className="flex justify-between items-start mb-10">
                        <div>
                            <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.3em]">Actividad Mensual</h3>
                            <span className="text-xs font-bold text-slate-400 mt-1 inline-block">Últimos 6 meses</span>
                        </div>
                    </div>
                    <div className="flex-1 flex items-end justify-around gap-2 px-2 border-b border-slate-100 pb-4">
                        {data?.chart?.map((m, i) => {
                            const barHeight = Math.round((m.count / maxVal) * 100);
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-3 group relative h-full justify-end">
                                    <div 
                                        className={`w-full max-w-[40px] rounded-t-lg transition-all duration-1000 ease-out shadow-sm ${m.count > 0 ? 'bg-orange-500' : 'bg-slate-50'}`}
                                        style={{ height: m.count > 0 ? `${barHeight}%` : '4px' }}
                                    >
                                        {m.count > 0 && (
                                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                {m.count}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xs font-black text-slate-400 uppercase">{m.label}</span>
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
                                    <p className="text-xs font-black leading-tight uppercase">{a.msg}</p>
                                    <p className="text-xs text-slate-400 font-bold mt-1 uppercase">{a.val}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                                <span className="material-symbols-outlined text-5xl text-white mb-3">verified</span>
                                <p className="text-xs font-black uppercase tracking-widest text-white">Operación Segura</p>
                                <p className="text-xs text-slate-400 font-medium mt-1">Sin alertas activas</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 4. BITÁCORA RECIENTE — desktop */}
            <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden text-left">
                <div className="p-8 border-b flex justify-between items-center bg-slate-50/30">
                    <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest">Actividad Reciente</h3>
                    <Link href="/dashboard/logbook" className="text-xs font-black text-orange-600 uppercase underline">Ver Historial</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 text-xs font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-8 py-5">Referencia</th>
                                <th className="px-8 py-5">Tripulación (PIC)</th>
                                <th className="px-8 py-5">Aeronave (UAV)</th>
                                <th className="px-8 py-5 text-right">Estatus</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data?.recentActivity && data.recentActivity.length > 0 ? data.recentActivity.map(f => (
                                <tr key={f.id} className="hover:bg-slate-50 transition-all">
                                    <td className="px-8 py-6 text-xs font-black font-mono text-orange-600">
                                        {f.mission_id || 'N/A'}
                                    </td>
                                    <td className="px-8 py-6 text-xs font-bold text-slate-700">
                                        {f.profiles?.full_name || 'No registrado'}
                                    </td>
                                    <td className="px-8 py-6 text-xs font-black uppercase text-slate-400">
                                        {f.aircraft?.model || 'N/R'}
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black uppercase border border-emerald-100 shadow-sm">
                                            Registrado
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4">
                                        <EmptyState icon="flight_takeoff" message="Sin actividad operativa" sub="Los vuelos registrados aparecerán aquí" />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 4b. BITÁCORA RECIENTE — móvil */}
            <div className="md:hidden bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b flex justify-between items-center bg-slate-50/30">
                    <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest">Actividad Reciente</h3>
                    <Link href="/dashboard/logbook" className="text-xs font-black text-orange-600 uppercase underline">Ver todo</Link>
                </div>
                {data?.recentActivity && data.recentActivity.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {data.recentActivity.map(f => (
                            <div key={f.id} className="px-5 py-4 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-black font-mono text-orange-600 truncate">{f.mission_id || 'N/A'}</p>
                                    <p className="text-xs text-slate-600 font-bold mt-0.5 truncate">{f.profiles?.full_name || 'No registrado'}</p>
                                    <p className="text-xs text-slate-400 uppercase font-black mt-0.5 truncate">{f.aircraft?.model || 'N/R'}</p>
                                </div>
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black uppercase border border-emerald-100 shrink-0">
                                    OK
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState icon="flight_takeoff" message="Sin actividad operativa" sub="Los vuelos registrados aparecerán aquí" />
                )}
            </div>
        </div>
    );
}

function EmptyState({ icon, message, sub }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center opacity-40">
            <span className="material-symbols-outlined text-5xl text-slate-400 mb-3">{icon}</span>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">{message}</p>
            {sub && <p className="text-xs text-slate-400 font-medium mt-1">{sub}</p>}
        </div>
    );
}

function KPICard({ title, value, icon, warning, color, trend }) {
    return (
        <div className={`bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:-translate-y-1 ${warning ? 'ring-2 ring-red-500/30 bg-red-50/5' : ''}`}>
            <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-black uppercase text-slate-400 tracking-widest leading-none">{title}</span>
                <span className={`material-symbols-outlined text-xl md:text-2xl ${warning ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}>{icon}</span>
            </div>
            <span className={`text-2xl md:text-4xl font-black tracking-tighter ${warning ? 'text-red-600' : color}`}>{value || 0}</span>
            {trend !== null && trend !== undefined && (
                <span className={`mt-2 text-xs font-black flex items-center gap-1 ${trend >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                    <span className="material-symbols-outlined text-sm">{trend >= 0 ? 'trending_up' : 'trending_down'}</span>
                    {trend >= 0 ? '+' : ''}{trend}% vs mes anterior
                </span>
            )}
        </div>
    );
}