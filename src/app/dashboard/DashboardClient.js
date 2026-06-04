'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function DashboardClient() {
  const [data,           setData]          = useState(null);
  const [loading,        setLoading]       = useState(true);
  const [firstName,      setFirstName]     = useState('Operador');
  const [planActivated,  setPlanActivated] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('plan_activated')) {
      setPlanActivated(true);
      sessionStorage.removeItem('plan_activated');
      setTimeout(() => setPlanActivated(false), 6000);
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        // Nombre del usuario desde el token local — sin roundtrip a la BD.
        // user_metadata.first_name se establece en el registro y se actualiza
        // desde settings/profile. getSession() lee la cookie local sin round-trip.
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { window.location.href = '/login'; return; }

        const meta = session.user.user_metadata ?? {};
        const name = meta.first_name || meta.full_name?.split(' ')[0] || 'Operador';
        setFirstName(name);

        const dashRes = await fetch('/api/dashboard');
        const json = await dashRes.json();
        setData(json);
      } catch (e) {
        console.error('Dashboard load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <div className="h-full flex items-center justify-center py-32">
      <div className="text-center space-y-3">
        <div className="size-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-black text-slate-300 uppercase tracking-widest animate-pulse">Cargando panel...</p>
      </div>
    </div>
  );

  const counts   = data?.chart?.map(m => m.count) || [0];
  const maxVal   = Math.max(...counts, 1);
  const lastTwo  = counts.slice(-2);
  const flightTrend = lastTwo.length === 2 && lastTwo[0] > 0
    ? Math.round(((lastTwo[1] - lastTwo[0]) / lastTwo[0]) * 100)
    : null;

  const alertsCount = data?.stats?.alertsCount || 0;
  const chartLabel  = `Actividad de vuelo — últimos 6 meses. ${(data?.chart || []).map(m => `${m.label}: ${m.count} vuelo${m.count !== 1 ? 's' : ''}`).join(', ')}.`;

  return (
    <div className="space-y-5 md:space-y-8 animate-in fade-in duration-700 text-left pb-4">

      {/* BANNER PLAN ACTIVADO */}
      {planActivated && (
        <div role="status" aria-live="polite"
          className="flex items-center gap-4 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 animate-in slide-in-from-top-2 duration-500">
          <span className="material-symbols-outlined text-2xl text-emerald-500" aria-hidden="true">check_circle</span>
          <div>
            <p className="text-sm font-black text-emerald-800 uppercase tracking-tight">¡Plan activado exitosamente!</p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">
              Tu nuevo plan ya está activo.{' '}
              <Link href="/dashboard/subscription" className="underline font-black">Ver suscripción</Link>
            </p>
          </div>
        </div>
      )}

      {/* SALUDO */}
      <div>
        <h2 className="text-lg md:text-2xl font-black text-slate-800">
          Bienvenido, <span className="text-orange-500">{firstName}</span>
        </h2>
        <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wider" aria-label="Fecha actual">
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* 1. KPIs */}
      <section aria-label="Indicadores clave de operación">
        {/* Hero KPI — Horas de Vuelo span completo en desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          <KPICard
            title="Horas de Vuelo" value={`${data?.stats?.hours || '0.0'}h`}
            icon="timer" color="text-slate-900" trend={flightTrend}
            hero className="col-span-2 md:col-span-1"
          />
          <KPICard title="Flota Lista"  value={data?.stats?.fleetCount  || 0} icon="precision_manufacturing" color="text-orange-500" />
          <KPICard title="Tripulación"  value={data?.stats?.pilotCount  || 0} icon="group"                  color="text-slate-900" />
          <KPICard title="Alertas"      value={alertsCount}                   icon="warning"                warning={alertsCount > 0}
            sub={alertsCount > 0 ? `${alertsCount} elemento${alertsCount !== 1 ? 's' : ''} require${alertsCount === 1 ? '' : 'n'} atención` : 'Operación sin alertas'} />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">

        {/* 2. GRÁFICO MENSUAL */}
        <figure className="lg:col-span-2 bg-white p-5 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-[260px] md:h-[420px]"
          aria-label={chartLabel}>
          <figcaption className="flex justify-between items-start mb-4 md:mb-10">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] md:tracking-[0.3em]">Actividad Mensual</h3>
              <span className="text-xs font-bold text-slate-400 mt-0.5 inline-block">Últimos 6 meses</span>
            </div>
            {flightTrend !== null && (
              <span className={`text-xs font-black flex items-center gap-1 px-2 py-1 rounded-lg ${flightTrend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}
                aria-label={`Tendencia: ${flightTrend >= 0 ? 'subió' : 'bajó'} ${Math.abs(flightTrend)}% vs mes anterior`}>
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  {flightTrend >= 0 ? 'trending_up' : 'trending_down'}
                </span>
                {flightTrend >= 0 ? '+' : ''}{flightTrend}%
              </span>
            )}
          </figcaption>

          {/* Barras — accesibles individualmente */}
          <div className="flex-1 flex items-end justify-around gap-1 md:gap-2 px-1 border-b border-slate-100 pb-3"
            role="img" aria-hidden="true">
            {(data?.chart || []).map((m, i) => {
              const barHeight = Math.round((m.count / maxVal) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end"
                  title={`${m.label}: ${m.count} vuelo${m.count !== 1 ? 's' : ''}`}>
                  {m.count > 0 && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="md:hidden text-[10px] font-black text-orange-600">{m.count}</span>
                      <span className="hidden md:block bg-slate-900 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {m.count}
                      </span>
                    </div>
                  )}
                  <div
                    className={`w-full max-w-[36px] rounded-t-lg transition-all duration-1000 ease-out shadow-sm ${m.count > 0 ? 'bg-orange-500' : 'bg-slate-100'}`}
                    style={{ height: m.count > 0 ? `${barHeight}%` : '3px' }}
                  />
                  <span className="text-xs font-black text-slate-400 uppercase">{m.label}</span>
                </div>
              );
            })}
          </div>

          {/* Tabla de datos para lectores de pantalla */}
          <table className="sr-only">
            <caption>Vuelos registrados por mes — últimos 6 meses</caption>
            <thead><tr><th scope="col">Mes</th><th scope="col">Vuelos</th></tr></thead>
            <tbody>
              {(data?.chart || []).map((m, i) => (
                <tr key={i}><td>{m.label}</td><td>{m.count}</td></tr>
              ))}
            </tbody>
          </table>
        </figure>

        {/* 3. ALERTAS COMPLIANCE */}
        <section aria-label="Alertas de compliance operacional"
          className="bg-[#1A202C] p-5 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl text-white flex flex-col h-[260px] md:h-[420px] border border-white/5">
          <h3 className="text-xs font-black uppercase text-orange-500 mb-4 md:mb-8 tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-lg" aria-hidden="true">gavel</span> Compliance
          </h3>
          <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1" role="list"
            aria-label={alertsCount > 0 ? `${alertsCount} alerta${alertsCount !== 1 ? 's' : ''} activa${alertsCount !== 1 ? 's' : ''}` : 'Sin alertas activas'}>
            {data?.alerts?.length > 0 ? data.alerts.map((a, i) => (
              <div key={i} role="listitem"
                className="p-4 rounded-2xl border border-white/10 bg-white/5 flex items-start gap-4">
                <span className={`material-symbols-outlined text-sm ${a.type === 'CRÍTICO' ? 'text-red-500' : 'text-orange-500'}`}
                  aria-label={a.type === 'CRÍTICO' ? 'Alerta crítica' : 'Advertencia'}>
                  {a.type === 'CRÍTICO' ? 'report' : 'notification_important'}
                </span>
                <div>
                  <p className="text-xs font-black leading-tight uppercase">{a.msg}</p>
                  <p className="text-xs text-slate-400 font-bold mt-1 uppercase">{a.val}</p>
                </div>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-center" aria-live="polite">
                <span className="material-symbols-outlined text-5xl text-white mb-3" aria-hidden="true">verified</span>
                <p className="text-xs font-black uppercase tracking-widest text-white">Operación Segura</p>
                <p className="text-xs text-slate-400 font-medium mt-1">Sin alertas activas</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 4. BITÁCORA RECIENTE — desktop */}
      <section aria-label="Actividad reciente de vuelo" className="hidden md:block bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden text-left">
        <div className="p-8 border-b flex justify-between items-center bg-slate-50/30">
          <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest">Actividad Reciente</h3>
          <Link href="/dashboard/logbook" className="text-xs font-black text-orange-600 uppercase underline">Ver Historial</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left" aria-label="Vuelos recientes">
            <caption className="sr-only">Últimos vuelos registrados en la bitácora</caption>
            <thead>
              <tr className="bg-slate-50/50 text-xs font-black text-slate-400 uppercase tracking-widest">
                <th scope="col" className="px-8 py-5">Referencia</th>
                <th scope="col" className="px-8 py-5">Tripulación (PIC)</th>
                <th scope="col" className="px-8 py-5">Aeronave (UAV)</th>
                <th scope="col" className="px-8 py-5 text-right">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.recentActivity?.length > 0 ? data.recentActivity.map(f => (
                <tr key={f.id} className="hover:bg-slate-50 transition-all">
                  <td className="px-8 py-6 text-xs font-black font-mono text-orange-600">{f.mission_id || 'N/A'}</td>
                  <td className="px-8 py-6 text-xs font-bold text-slate-700">{f.pilots?.name || 'No registrado'}</td>
                  <td className="px-8 py-6 text-xs font-black uppercase text-slate-400">{f.aircraft?.model || 'N/R'}</td>
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
      </section>

      {/* 4b. BITÁCORA RECIENTE — mobile */}
      <section aria-label="Actividad reciente de vuelo" className="md:hidden bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex justify-between items-center bg-slate-50/30">
          <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest">Actividad Reciente</h3>
          <Link href="/dashboard/logbook" className="text-xs font-black text-orange-600 uppercase underline">Ver todo</Link>
        </div>
        {data?.recentActivity?.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {data.recentActivity.map(f => (
              <li key={f.id} className="px-5 py-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black font-mono text-orange-600 truncate">{f.mission_id || 'N/A'}</p>
                  <p className="text-xs text-slate-600 font-bold mt-0.5 truncate">{f.pilots?.name || 'No registrado'}</p>
                  <p className="text-xs text-slate-400 uppercase font-black mt-0.5 truncate">{f.aircraft?.model || 'N/R'}</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black uppercase border border-emerald-100 shrink-0">OK</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="flight_takeoff" message="Sin actividad operativa" sub="Los vuelos registrados aparecerán aquí" />
        )}
      </section>
    </div>
  );
}

function EmptyState({ icon, message, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center opacity-40">
      <span className="material-symbols-outlined text-5xl text-slate-400 mb-3" aria-hidden="true">{icon}</span>
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">{message}</p>
      {sub && <p className="text-xs text-slate-400 font-medium mt-1">{sub}</p>}
    </div>
  );
}

function KPICard({ title, value, icon, warning, color, trend, hero, sub, className }) {
  const trendLabel = trend !== null && trend !== undefined
    ? `${trend >= 0 ? 'Subió' : 'Bajó'} ${Math.abs(trend)}% vs mes anterior`
    : null;

  return (
    <div className={`bg-white p-4 md:p-8 rounded-2xl md:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:-translate-y-1 ${warning ? 'ring-2 ring-red-500/30 bg-red-50/5' : ''} ${className || ''}`}
      role="region"
      aria-label={`${title}: ${value}${trendLabel ? `. ${trendLabel}` : ''}${sub ? `. ${sub}` : ''}`}>
      <div className="flex justify-between items-start mb-3 md:mb-4">
        <span className="text-xs font-black uppercase text-slate-400 tracking-wide leading-tight max-w-[80%]">{title}</span>
        <span className={`material-symbols-outlined text-xl ${warning ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}
          aria-hidden="true">{icon}</span>
      </div>
      <span className={`${hero ? 'text-3xl md:text-5xl' : 'text-2xl md:text-4xl'} font-black tracking-tighter ${warning ? 'text-red-600' : color}`}
        aria-hidden="true">
        {value ?? 0}
      </span>
      {trend !== null && trend !== undefined && (
        <span className={`mt-1.5 text-xs font-black flex items-center gap-1 ${trend >= 0 ? 'text-emerald-500' : 'text-red-400'}`}
          aria-hidden="true">
          <span className="material-symbols-outlined text-sm" aria-hidden="true">
            {trend >= 0 ? 'trending_up' : 'trending_down'}
          </span>
          {trend >= 0 ? '+' : ''}{trend}% vs mes ant.
        </span>
      )}
      {sub && !trend && (
        <span className={`mt-1.5 text-xs font-bold ${warning ? 'text-red-400' : 'text-slate-400'}`} aria-hidden="true">
          {sub}
        </span>
      )}
    </div>
  );
}
