'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrgContext } from '@/lib/apiAuth';

// Dashboard personalizado para el piloto dentro de una organización:
// solo su información — vuelos programados, horas realizadas, pendientes
// y accesos rápidos a reportes VOR / MOR.
export default function PilotDashboard({ firstName }) {
  const [loading, setLoading] = useState(true);
  const [orgCode, setOrgCode] = useState(null);
  const [stats, setStats] = useState({ scheduled: 0, completed: 0, hours: '0.0' });
  const [scheduled, setScheduled] = useState([]); // misiones programadas (pendientes)
  const [monthly, setMonthly] = useState([]);     // [{ label, hours }] últimos 6 meses

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) { window.location.href = '/login'; return; }

        const ctx = await getOrgContext(supabase);
        if (!ctx.orgId) { setLoading(false); return; }
        const orgId = ctx.orgId;

        // Código de la org para las URLs públicas de reporte
        const { data: org } = await supabase
          .from('organizations').select('slug, unique_code').eq('id', orgId).maybeSingle();
        setOrgCode(org?.slug || org?.unique_code || null);

        // Fila pilots vinculada al usuario
        const { data: pilot } = await supabase
          .from('pilots').select('id')
          .eq('organization_id', orgId)
          .or(`profile_id.eq.${user.id},owner_id.eq.${user.id},email.eq.${user.email}`)
          .limit(1).maybeSingle();
        const myPilotId = pilot?.id || null;

        // Duración de un vuelo en horas (total_time, o estimada por horario)
        const flightHours = (f) => {
          if (f.total_time) return Number(f.total_time);
          if (f.takeoff_time && f.landing_time) {
            const [h1, m1] = f.takeoff_time.split(':').map(Number);
            const [h2, m2] = f.landing_time.split(':').map(Number);
            const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
            if (diff > 0) return diff / 60;
          }
          return 0;
        };

        // Vuelos realizados por el piloto + horas + gráfica mensual
        let completed = 0, hours = 0;
        const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const now = new Date();
        const buckets = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          buckets.push({ label: monthNames[d.getMonth()], year: d.getFullYear(), month: d.getMonth() + 1, hours: 0 });
        }
        if (myPilotId) {
          const { data: flights } = await supabase
            .from('flights')
            .select('total_time, takeoff_time, landing_time, flight_date')
            .eq('organization_id', orgId)
            .eq('pilot_id', myPilotId);
          completed = flights?.length || 0;
          (flights || []).forEach(f => {
            const h = flightHours(f);
            hours += h;
            if (f.flight_date) {
              const [fy, fm] = f.flight_date.split('-').map(Number);
              const b = buckets.find(x => x.year === fy && x.month === fm);
              if (b) b.hours += h;
            }
          });
        }
        setMonthly(buckets.map(b => ({ label: b.label, hours: b.hours })));

        // Misiones programadas y asignadas a mí (autorize ya excluye realizado/cancelado)
        let mine = [];
        try {
          const res = await fetch('/api/flights/authorize');
          const data = await res.json();
          const rows = Array.isArray(data) ? data : [];
          mine = rows.filter(m =>
            (myPilotId && m.pilot_id === myPilotId) ||
            String(m.pilots?.email || '').toLowerCase() === String(user.email || '').toLowerCase()
          );
        } catch { /* silencioso */ }

        setScheduled(mine);
        setStats({ scheduled: mine.length, completed, hours: hours.toFixed(1) });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return (
    <div className="h-full flex items-center justify-center py-32">
      <div className="text-center space-y-3">
        <div className="size-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-black text-slate-300 uppercase tracking-widest animate-pulse">Cargando panel...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 text-left pb-4">

      {/* SALUDO */}
      <div>
        <h2 className="text-lg md:text-2xl font-black text-slate-800">
          Bienvenido, <span className="text-orange-500">{firstName}</span>
        </h2>
        <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wider">
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPIs propios */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6" aria-label="Mis indicadores de vuelo">
        <KPICard title="Horas de Vuelo"     value={`${stats.hours}h`} icon="timer"          hero className="col-span-2 md:col-span-1" />
        <KPICard title="Vuelos Realizados"  value={stats.completed}   icon="task_alt"       color="text-emerald-500" />
        <KPICard title="Vuelos Pendientes"  value={stats.scheduled}   icon="event_upcoming" color="text-orange-500" />
      </section>

      {/* Gráfica de horas mensuales */}
      <figure className="bg-white p-5 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col h-[240px] md:h-[320px]"
        aria-label={`Horas de vuelo por mes — últimos 6 meses. ${monthly.map(m => `${m.label}: ${m.hours.toFixed(1)} horas`).join(', ')}.`}>
        <figcaption className="mb-4 md:mb-8">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Horas Mensuales</h3>
          <span className="text-xs font-bold text-slate-400 mt-0.5 inline-block">Últimos 6 meses</span>
        </figcaption>
        <div className="flex-1 flex items-end justify-around gap-1 md:gap-2 px-1 border-b border-slate-100 pb-3" role="img" aria-hidden="true">
          {(() => {
            const maxH = Math.max(...monthly.map(m => m.hours), 1);
            return monthly.map((m, i) => {
              const barHeight = Math.round((m.hours / maxH) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end"
                  title={`${m.label}: ${m.hours.toFixed(1)}h`}>
                  {m.hours > 0 && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="md:hidden text-[10px] font-black text-orange-600">{m.hours.toFixed(1)}</span>
                      <span className="hidden md:block bg-slate-900 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {m.hours.toFixed(1)}h
                      </span>
                    </div>
                  )}
                  <div
                    className={`w-full max-w-[36px] rounded-t-lg transition-all duration-1000 ease-out shadow-sm ${m.hours > 0 ? 'bg-orange-500' : 'bg-slate-100'}`}
                    style={{ height: m.hours > 0 ? `${barHeight}%` : '3px' }}
                  />
                  <span className="text-xs font-black text-slate-400 uppercase">{m.label}</span>
                </div>
              );
            });
          })()}
        </div>
        <table className="sr-only">
          <caption>Horas de vuelo por mes — últimos 6 meses</caption>
          <thead><tr><th scope="col">Mes</th><th scope="col">Horas</th></tr></thead>
          <tbody>
            {monthly.map((m, i) => <tr key={i}><td>{m.label}</td><td>{m.hours.toFixed(1)}</td></tr>)}
          </tbody>
        </table>
      </figure>

      {/* Accesos a reportes */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4" aria-label="Reportes de ocurrencia">
        <ReportButton
          href={orgCode ? `/vor/${orgCode}` : '#'}
          color="sky" icon="volunteer_activism"
          title="Reporte VOR"
          sub="Reporte Voluntario de Ocurrencia"
          disabled={!orgCode}
        />
        <ReportButton
          href={orgCode ? `/mor/${orgCode}` : '#'}
          color="rose" icon="warning"
          title="Reporte MOR"
          sub="Reporte Obligatorio de Ocurrencia"
          disabled={!orgCode}
        />
      </section>

      {/* Mis vuelos programados */}
      <section aria-label="Vuelos programados" className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 md:px-8 py-4 md:py-5 border-b flex justify-between items-center bg-slate-50/30">
          <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest">Mis Vuelos Programados</h3>
          <Link href="/dashboard/mis-vuelos" className="text-xs font-black text-orange-600 uppercase underline">Ver todos</Link>
        </div>
        {scheduled.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center opacity-40">
            <span className="material-symbols-outlined text-5xl text-slate-400 mb-3">event_busy</span>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Sin vuelos programados</p>
            <p className="text-xs text-slate-400 font-medium mt-1">La gerencia te asignará misiones aquí</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {scheduled.slice(0, 6).map(m => (
              <li key={m.id} className="px-5 md:px-8 py-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black font-mono text-orange-600 truncate">{m.mission_id}</p>
                  <p className="text-xs text-slate-600 font-bold mt-0.5 truncate">
                    {m.aircraft?.model || 'Aeronave por asignar'}{m.location ? ` · ${m.location}` : ''}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {m.scheduled_at ? String(m.scheduled_at).slice(0, 10) : 'Fecha por definir'}
                  </p>
                </div>
                <Link
                  href="/dashboard/logbook/new"
                  className="shrink-0 px-3 py-2 bg-orange-50 text-orange-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-100 transition-colors"
                >
                  Despachar
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ReportButton({ href, color, icon, title, sub, disabled }) {
  const palette = color === 'sky'
    ? 'border-sky-200 hover:border-sky-400 text-sky-600'
    : 'border-rose-200 hover:border-rose-400 text-rose-600';
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={disabled}
      className={`flex items-center gap-4 bg-white p-5 md:p-6 rounded-[2rem] border-2 transition-all shadow-sm ${palette} ${disabled ? 'opacity-50 pointer-events-none' : 'hover:-translate-y-0.5'}`}
    >
      <span className={`material-symbols-outlined text-3xl shrink-0`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-black uppercase tracking-widest text-slate-900">{title}</p>
        <p className="text-xs font-bold text-slate-400 mt-0.5">{sub}</p>
      </div>
      <span className="material-symbols-outlined text-slate-300 ml-auto shrink-0">chevron_right</span>
    </Link>
  );
}

function KPICard({ title, value, icon, color = 'text-slate-900', hero, className }) {
  return (
    <div className={`bg-white p-4 md:p-8 rounded-2xl md:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:-translate-y-1 ${className || ''}`}>
      <div className="flex justify-between items-start mb-3 md:mb-4">
        <span className="text-xs font-black uppercase text-slate-400 tracking-wide leading-tight max-w-[80%]">{title}</span>
        <span className="material-symbols-outlined text-xl text-orange-500">{icon}</span>
      </div>
      <span className={`${hero ? 'text-3xl md:text-5xl' : 'text-2xl md:text-4xl'} font-black tracking-tighter ${color}`}>
        {value ?? 0}
      </span>
    </div>
  );
}
