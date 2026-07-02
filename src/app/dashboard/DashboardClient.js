'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrgPlan } from '@/lib/orgPlan';
import PageHero from '@/components/PageHero';
import KPIStrip from '@/components/KPIStrip';

// Banner de instalación PWA — solo en dashboard, flotante en esquina
const PwaInstallBanner  = dynamic(() => import('@/components/PwaInstallBanner'), { ssr: false });
const OnboardingBanner  = dynamic(() => import('@/components/OnboardingBanner'), { ssr: false });
const InvitationsBanner = dynamic(() => import('@/components/InvitationsBanner'), { ssr: false });
const PilotDashboard    = dynamic(() => import('./PilotDashboard'), { ssr: false });

export default function DashboardClient() {
  const [data,           setData]          = useState(null);
  const [loading,        setLoading]       = useState(true);
  const [firstName,      setFirstName]     = useState('Operador');
  const [planActivated,  setPlanActivated] = useState(false);
  const [profilePlan,    setProfilePlan]   = useState(null);
  const [profileRole,    setProfileRole]   = useState(null);

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

        // Perfil para plan/rol (OnboardingBanner)
        const { data: prof } = await supabase
          .from('profiles')
          .select('role, subscription_plan, organization_id')
          .eq('id', session.user.id)
          .single();
        if (prof) {
          setProfileRole(prof.role);
          // El plan efectivo de la org vive en el perfil del admin
          // (organizations no tiene columna subscription_plan).
          const plan = await getOrgPlan(supabase, prof.organization_id, prof.subscription_plan || 'piloto');
          setProfilePlan(plan);
        }

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

  // Piloto de organización: dashboard personalizado con su propia información.
  if (profileRole === 'piloto') {
    return <PilotDashboard firstName={firstName} />;
  }

  const counts   = data?.chart?.map(m => m.count) || [0];
  const maxVal   = Math.max(...counts, 1);
  const lastTwo  = counts.slice(-2);
  const flightTrend = lastTwo.length === 2 && lastTwo[0] > 0
    ? Math.round(((lastTwo[1] - lastTwo[0]) / lastTwo[0]) * 100)
    : null;

  const alertsCount = data?.stats?.alertsCount || 0;
  const chartLabel  = `Actividad de vuelo — últimos 6 meses. ${(data?.chart || []).map(m => `${m.label}: ${m.count} vuelo${m.count !== 1 ? 's' : ''}`).join(', ')}.`;

  // Bloque derecho del hero: próxima misión + anillo "Flota lista" (ver /api/dashboard)
  const fleetTotal = data?.stats?.fleetCount || 0;
  const fleetReady = data?.stats?.fleetReadyCount ?? fleetTotal;
  const fleetPct = fleetTotal > 0 ? Math.round((fleetReady / fleetTotal) * 100) : 100;
  const ringCircumference = 2 * Math.PI * 19;
  const ringOffset = ringCircumference * (1 - fleetPct / 100);

  const flightsThisMonth = data?.chart?.length ? data.chart[data.chart.length - 1].count : 0;
  const fleetInMaintenance = Math.max(0, fleetTotal - fleetReady);

  const nextMission = data?.nextMission;
  let nextMissionLabel = null;
  if (nextMission?.date) {
    const d = new Date(`${nextMission.date}T00:00:00`);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dateLabel = d.getTime() === today.getTime()
      ? 'Hoy'
      : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    nextMissionLabel = nextMission.time ? `${dateLabel} · ${nextMission.time}` : dateLabel;
  }

  return (
    <div className="space-y-5 md:space-y-8 animate-in fade-in duration-700 text-left pb-4">

      {/* BANNER INVITACIONES PENDIENTES — para quien fue invitado a una org */}
      <InvitationsBanner />

      {/* BANNER ONBOARDING — solo admin/jefe_pilotos, org sin aeronaves, NO para piloto independiente */}
      {profileRole && profilePlan && profilePlan !== 'piloto' && data && (
        <OnboardingBanner aircraftCount={data.stats?.fleetCount ?? 0} />
      )}

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
      <PageHero
        eyebrow="Panel de Control"
        title={`Bienvenido, ${firstName}`}
        description={new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        right={
          <>
            {nextMissionLabel && (
              <div className="hidden sm:flex flex-col justify-center pr-4 md:pr-6 border-r border-white/10">
                <p className="text-xs font-black uppercase tracking-wide text-white/40">Próxima misión</p>
                <p className="text-sm font-black text-white mt-1 whitespace-nowrap">{nextMissionLabel}</p>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <div className="relative size-11 shrink-0">
                <svg width="46" height="46" viewBox="0 0 46 46" className="-rotate-90" aria-hidden="true">
                  <circle cx="23" cy="23" r="19" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="5" />
                  <circle cx="23" cy="23" r="19" fill="none" stroke="#ec5b13" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={ringCircumference} strokeDashoffset={ringOffset} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-white">{fleetPct}%</div>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-white/40">Flota lista</p>
                <p className="text-xs font-bold text-white/80 mt-0.5 whitespace-nowrap">{fleetReady} de {fleetTotal} aeronaves</p>
              </div>
            </div>
          </>
        }
      />

      {/* 1. KPIs — franja sin cajas (variant="strip"), fiel al mockup Dashboard Layout 1a.
          El resto de páginas (Flota, Bitácora, etc.) sigue usando la variante "card". */}
      <section aria-label="Indicadores clave de operación" className="bg-white rounded-[1.5rem] border border-slate-100 px-2 py-5 md:px-4">
        <KPIStrip variant="strip" items={[
          {
            key: 'hours', label: 'Horas de Vuelo', value: data?.stats?.hours || '0.0', unit: 'h',
            icon: 'schedule', iconColor: '#ec5b13',
            delta: flightTrend !== null ? `${flightTrend >= 0 ? '+' : ''}${flightTrend}% vs. mes ant.` : null,
            deltaTone: flightTrend !== null && flightTrend >= 0 ? 'positive' : 'neutral',
          },
          {
            key: 'flights', label: 'Vuelos del Mes', value: flightsThisMonth, unit: '',
            icon: 'flight_takeoff', iconColor: '#ec5b13',
            delta: flightTrend !== null ? `${flightTrend >= 0 ? '+' : ''}${flightTrend}% vs. mes ant.` : null,
            deltaTone: flightTrend !== null && flightTrend >= 0 ? 'positive' : 'neutral',
          },
          {
            key: 'fleet', label: 'Aeronaves Activas', value: fleetReady, unit: `/ ${fleetTotal}`,
            icon: 'precision_manufacturing', iconColor: '#94a3b8',
            delta: fleetInMaintenance > 0 ? `${fleetInMaintenance} en mantenimiento` : 'Todas operativas',
            deltaTone: fleetInMaintenance > 0 ? 'neutral' : 'positive',
          },
          {
            key: 'alerts', label: 'Alertas Activas', value: alertsCount, unit: '',
            icon: 'warning', iconColor: alertsCount > 0 ? '#dc2626' : '#16a34a',
            delta: alertsCount > 0 ? `${alertsCount} requiere${alertsCount === 1 ? '' : 'n'} atención` : 'Operación sin alertas',
            deltaTone: alertsCount > 0 ? 'neutral' : 'positive',
          },
        ]} />
      </section>

      {/* 2+3. GRÁFICO MENSUAL + ALERTAS — una sola tarjeta blanca, lado a lado
          (antes eran 2 tarjetas separadas con el panel de alertas en navy oscuro).
          Mismos aria-labels/roles que antes, solo cambia el contenedor visual. */}
      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col lg:flex-row">

        {/* GRÁFICO MENSUAL */}
        <figure className="lg:flex-[1.5] p-5 md:p-10 flex flex-col h-[260px] md:h-[420px]" aria-label={chartLabel}>
          <figcaption className="flex justify-between items-start mb-4 md:mb-10">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] md:tracking-[0.3em]">Vuelos por Mes</h3>
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

        <div className="hidden lg:block w-px bg-slate-100 my-10" />
        <div className="lg:hidden h-px bg-slate-100 mx-5 md:mx-10" />

        {/* ALERTAS ACTIVAS */}
        <section aria-label="Alertas activas de la operación"
          className="lg:flex-1 p-5 md:p-10 flex flex-col h-[260px] md:h-[420px]">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] md:tracking-[0.3em] mb-4 md:mb-10 flex items-center gap-2">
            Alertas Activas
            {alertsCount > 0 && (
              <span className="text-[10px] font-black text-white bg-orange-600 rounded-full px-2 py-0.5">{alertsCount}</span>
            )}
          </h3>
          <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar flex-1" role="list"
            aria-label={alertsCount > 0 ? `${alertsCount} alerta${alertsCount !== 1 ? 's' : ''} activa${alertsCount !== 1 ? 's' : ''}` : 'Sin alertas activas'}>
            {data?.alerts?.length > 0 ? data.alerts.map((a, i) => (
              <div key={i} role="listitem" className="flex items-start gap-2.5 py-2.5 border-b border-slate-100 last:border-b-0">
                <span
                  className={`size-1.5 rounded-full mt-1.5 shrink-0 ${a.type === 'CRÍTICO' ? 'bg-red-600' : 'bg-amber-500'}`}
                  aria-label={a.type === 'CRÍTICO' ? 'Alerta crítica' : 'Advertencia'}
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 leading-tight">{a.msg}</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{a.val}</p>
                </div>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center opacity-40 text-center" aria-live="polite">
                <span className="material-symbols-outlined text-5xl text-emerald-500 mb-3" aria-hidden="true">verified</span>
                <p className="text-xs font-black uppercase tracking-widest text-slate-700">Operación Segura</p>
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

      {/* PWA install banner — flotante en esquina inferior derecha, no invade contenido */}
      <div className="fixed bottom-24 lg:bottom-6 right-4 z-40 w-72 pointer-events-none">
        <div className="pointer-events-auto rounded-2xl overflow-hidden shadow-2xl">
          <PwaInstallBanner />
        </div>
      </div>
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

