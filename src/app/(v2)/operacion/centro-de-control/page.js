'use client';

// Skylog V2.0 — Centro de Control (Operación), complemento del sitemap
// (36-sitemap.md §1/§3) que no existía todavía en V2. Explícitamente
// distinto de C2 en vivo (F2, ⏸ omitido): "panorama de la operación del día
// construido con datos que ya tenemos — misiones, tripulación, clima,
// estado de flota, pendientes", nunca telemetría en tiempo real desde el
// dron. Sin backend nuevo — compone 4 endpoints ya existentes en el
// cliente (mismo patrón ya usado en sms/page.js y dashboard/safety de v1),
// ninguno pensado específicamente para esta vista.
import { useCallback, useEffect, useState } from 'react';
import { computeExpiryAlerts } from '@skylog/domain';
import { SectionHero, SectionCard, StatCard } from '../../_components/SectionHero';

const MISSION_STATUS_META = {
  programada: { label: 'Programada', soft: 'bg-blue-100 text-blue-700' },
  despachada: { label: 'Despachada', soft: 'bg-amber-100 text-amber-700' },
  cerrada: { label: 'Cerrada', soft: 'bg-emerald-100 text-emerald-700' },
  cancelada: { label: 'Cancelada', soft: 'bg-navy-100 text-navy-500' },
};

const AIRCRAFT_STATUS_META = {
  disponible: { label: 'Disponible', dot: 'bg-emerald-500' },
  en_mantenimiento: { label: 'En mantenimiento', dot: 'bg-amber-500' },
  fuera_de_servicio: { label: 'Fuera de servicio', dot: 'bg-navy-300' },
};

function todayRangeISO() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString(), now };
}

function formatTime24(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function WeatherBadge({ weather }) {
  if (weather === undefined) return <span className="text-[10px] text-navy-300">Cargando clima…</span>;
  if (!weather) return <span className="text-[10px] text-navy-300">Sin zona geolocalizada</span>;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
        weather.canFly ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
      }`}
    >
      <span className="material-symbols-outlined text-[13px]">{weather.canFly ? 'check_circle' : 'warning'}</span>
      {weather.canFly ? 'Favorable' : 'Verifique su entorno'}
    </span>
  );
}

export default function CentroDeControlPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [missions, setMissions] = useState([]);
  const [flights, setFlights] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [openCases, setOpenCases] = useState(null); // null = no cargado / no es gestor
  const [weatherByMission, setWeatherByMission] = useState({});
  const [c2Sessions, setC2Sessions] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);

  const loadContext = useCallback(async () => {
    const res = await fetch('/api/duty/context');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error cargando contexto');
    return data;
  }, []);

  const loadAll = useCallback(async (orgId, isManager) => {
    const { start, end } = todayRangeISO();
    const [missionsRes, flightsRes, fleetRes] = await Promise.all([
      fetch(`/api/missions?organizationId=${orgId}&from=${start}&to=${end}`),
      fetch(`/api/flights?organizationId=${orgId}`),
      fetch(`/api/flota/aircraft?organizationId=${orgId}`),
    ]);
    const [missionsData, flightsData, fleetData] = await Promise.all([missionsRes.json(), flightsRes.json(), fleetRes.json()]);
    if (!missionsRes.ok) throw new Error(missionsData.error || 'Error cargando misiones de hoy');
    if (!flightsRes.ok) throw new Error(flightsData.error || 'Error cargando vuelos');
    if (!fleetRes.ok) throw new Error(fleetData.error || 'Error cargando flota');

    setMissions(missionsData.missions || []);
    setFleet(fleetData.aircraft || []);

    // Comando y Control (F2) — nunca falla el resto de la página si c2-gateway
    // no está desplegado todavía: la tabla puede existir sin filas, o el
    // fetch puede fallar si la migración no se aplicó; en cualquier caso se
    // degrada a lista vacía, nunca a un error bloqueante.
    try {
      const c2Res = await fetch(`/api/c2/sessions?organizationId=${orgId}`);
      if (c2Res.ok) {
        const c2Data = await c2Res.json();
        setC2Sessions(c2Data.sessions || []);
      } else {
        setC2Sessions([]);
      }
    } catch {
      setC2Sessions([]);
    }

    const { start: s } = todayRangeISO();
    const todayFlights = (flightsData.flights || []).filter((f) => f.takeoff_at >= s);
    setFlights(todayFlights);

    if (isManager) {
      const casesRes = await fetch(`/api/sms/cases?organizationId=${orgId}`);
      if (casesRes.ok) {
        const casesData = await casesRes.json();
        setOpenCases(casesData.restricted ? null : (casesData.cases || []).filter((c) => c.status !== 'cerrado').length);
      }
      // Vencimientos de pólizas y CDO-U (solo gestores: las pólizas lo son). Nunca rompe la página.
      try {
        const [polRes, certRes] = await Promise.all([fetch(`/api/polizas?organizationId=${orgId}`), fetch(`/api/organizacion/certification?organizationId=${orgId}`)]);
        const [polData, certData] = await Promise.all([polRes.ok ? polRes.json() : {}, certRes.ok ? certRes.json() : {}]);
        const todayBogota = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
        setExpiryAlerts(computeExpiryAlerts({ policies: polData.policies || [], cert: certData.certification }, todayBogota));
      } catch {
        setExpiryAlerts([]);
      }
    } else {
      setOpenCases(null);
      setExpiryAlerts([]);
    }

    // Clima por misión — solo las que tienen geometría real con al menos un
    // punto (zone_geo.points[0]); el resto queda honestamente "sin zona
    // geolocalizada" en vez de inventar coordenadas.
    (missionsData.missions || []).forEach((m) => {
      const point = m.zone_geo?.points?.[0];
      if (!point?.lat || !point?.lng) {
        setWeatherByMission((prev) => ({ ...prev, [m.id]: null }));
        return;
      }
      fetch(`/api/meteorologia/current?lat=${point.lat}&lon=${point.lng}`)
        .then((r) => r.json())
        .then((w) => setWeatherByMission((prev) => ({ ...prev, [m.id]: w })))
        .catch(() => setWeatherByMission((prev) => ({ ...prev, [m.id]: null })));
    });
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const ctx = await loadContext();
        setContext(ctx);
        const firstOrg = ctx.organizations?.[0];
        if (firstOrg) {
          setOrganizationId(firstOrg.id);
          await loadAll(firstOrg.id, firstOrg.role !== 'piloto');
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadContext, loadAll]);

  async function handleOrgChange(orgId) {
    setOrganizationId(orgId);
    const org = context.organizations.find((o) => o.id === orgId);
    setLoading(true);
    try {
      await loadAll(orgId, org?.role !== 'piloto');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !context) {
    return (
      <div className="h-full flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-black text-navy-300 uppercase tracking-widest animate-pulse">Cargando el centro de control…</p>
        </div>
      </div>
    );
  }

  if (!context?.personId) {
    return (
      <div className="space-y-4">
        <SectionHero eyebrow="Operación" title="Centro de Control" description="Panorama de la jornada de hoy." />
        <p className="text-sm text-navy-400">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  const { now } = todayRangeISO();
  const activeMissions = missions.filter((m) => m.status !== 'cancelada');
  const availableAircraft = fleet.filter((a) => a.operational_status === 'disponible').length;
  const maintenanceAircraft = fleet.filter((a) => a.operational_status === 'en_mantenimiento').length;
  const onlineDrones = c2Sessions.filter((s) => s.status === 'online');

  // Qué falta — ahora con datos exactos: la misión tiene estado propio (programada → despachada →
  // cerrada) desde el Despacho, ya no hace falta adivinar por piloto.
  //  · sin cerrar: despachada (el vuelo se despachó y falta registrarlo)
  //  · sin despachar: programada cuya hora ya pasó
  const pendingMissions = missions.filter((m) => m.status === 'despachada' || (m.status === 'programada' && new Date(m.scheduled_at) <= now));

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="Operación"
        title="Centro de Control"
        description={`Panorama de la jornada — ${now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}.`}
        cta={
          context.organizations?.length > 1 && (
            <select
              value={organizationId}
              onChange={(e) => handleOrgChange(e.target.value)}
              className="rounded-xl bg-white/10 border border-white/20 text-white text-xs px-3 py-2 backdrop-blur-sm"
            >
              {context.organizations.map((o) => (
                <option key={o.id} value={o.id} className="text-navy">
                  {o.name} ({o.role})
                </option>
              ))}
            </select>
          )
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon="satellite_alt" color="red" label="Drones en línea" value={onlineDrones.length} />
        <StatCard icon="event_available" color="primary" label="Misiones hoy" value={activeMissions.length} />
        <StatCard icon="flight_takeoff" color="blue" label="Vuelos registrados hoy" value={flights.length} />
        <StatCard icon="flight" color="emerald" label="Aeronaves disponibles" value={`${availableAircraft}/${fleet.length}`} />
        {openCases != null ? (
          <StatCard icon="report" color="red" label="Casos SMS abiertos" value={openCases} />
        ) : (
          <StatCard icon="pending_actions" color="amber" label="Pendientes por cerrar" value={pendingMissions.length} />
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      {expiryAlerts.length > 0 && (
        <SectionCard icon="event_busy" tile="bg-amber-500 text-white" wash="from-amber-50 to-white" title="Documentos por vencer" description="Pólizas y certificado de explotador que requieren atención">
          <ul className="space-y-2">
            {expiryAlerts.map((a) => (
              <li key={a.key} className={`flex items-start justify-between gap-3 rounded-xl px-3 py-2 text-sm ${a.severity === 'bad' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>
                <div>
                  <p className="font-semibold">{a.title}</p>
                  <p className="text-xs opacity-80">{a.detail}</p>
                </div>
                <a href={a.href} className="text-xs font-semibold underline shrink-0">Revisar →</a>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard
        icon="satellite_alt"
        tile="bg-red-500 text-white"
        wash="from-red-50 to-white"
        title="Comando y Control — drones en línea"
        description="Telemetría en vivo vía DJI Cloud API (F2). Nunca envía comandos de vuelo."
      >
        {onlineDrones.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-navy-200 p-6 text-center text-sm text-navy-400 space-y-1">
            <span className="material-symbols-outlined text-3xl text-navy-300 block">satellite_alt</span>
            <p className="font-bold">Sin dron conectado ahora mismo</p>
            <p className="text-xs">
              Requiere un RC con Pilot 2 apuntando a la página de enlace (<code className="bg-navy-50 px-1 rounded">/c2/pilot2</code>) y el
              servicio <code className="bg-navy-50 px-1 rounded">c2-gateway</code> desplegado — ver <code className="bg-navy-50 px-1 rounded">c2-gateway/README.md</code>.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {onlineDrones.map((s) => (
              <div key={s.id} className="bg-white rounded-xl border border-red-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-navy flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {s.aircraft ? `${s.aircraft.model?.brand} ${s.aircraft.model?.model} — ${s.aircraft.serial_number}` : s.drone_sn}
                  </p>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">EN LÍNEA</span>
                </div>
                {s.video_url ? (
                  <video src={s.video_url} autoPlay muted playsInline className="w-full rounded-lg mt-2 bg-navy-900" />
                ) : (
                  <p className="text-[11px] text-navy-300 mt-1">Sin servidor de video configurado todavía — solo telemetría.</p>
                )}
                {s.latest ? (
                  <div className="grid grid-cols-3 gap-1.5 mt-2 text-[11px]">
                    <div className="bg-navy-50/60 rounded px-2 py-1">
                      <p className="text-navy-300 text-[9px] uppercase font-bold">Altura</p>
                      <p className="font-black text-navy">{s.latest.height_m != null ? `${s.latest.height_m} m` : '—'}</p>
                    </div>
                    <div className="bg-navy-50/60 rounded px-2 py-1">
                      <p className="text-navy-300 text-[9px] uppercase font-bold">Vel. horiz.</p>
                      <p className="font-black text-navy">{s.latest.horizontal_speed_ms != null ? `${s.latest.horizontal_speed_ms} m/s` : '—'}</p>
                    </div>
                    <div className="bg-navy-50/60 rounded px-2 py-1">
                      <p className="text-navy-300 text-[9px] uppercase font-bold">Batería</p>
                      <p className="font-black text-navy">{s.latest.battery_pct != null ? `${s.latest.battery_pct}%` : '—'}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-navy-300 mt-1">Sin muestra de telemetría todavía.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {pendingMissions.length > 0 && (
        <SectionCard
          icon="pending_actions"
          tile="bg-amber-500 text-white"
          wash="from-amber-50 to-white"
          title="Qué falta por cerrar"
          description={`${pendingMissions.length} misión(es) de hoy: despachadas sin vuelo registrado, o programadas cuya hora ya pasó sin despachar`}
        >
          <div className="space-y-2">
            {pendingMissions.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 text-xs bg-white rounded-lg border border-amber-100 px-3 py-2">
                <div>
                  <p className="font-bold text-navy">{m.name}</p>
                  <p className="text-navy-400">
                    {m.pic?.full_name || '—'} · {m.status === 'despachada' ? 'despachada — falta registrar el vuelo' : `programada ${formatTime24(m.scheduled_at)} — sin despachar`}
                  </p>
                </div>
                <span className="material-symbols-outlined text-amber-500">{m.status === 'despachada' ? 'flight_land' : 'schedule'}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard
          icon="event_available"
          tile="bg-primary text-white"
          wash="from-primary-50 to-white"
          title="Qué se vuela hoy"
          description={`${activeMissions.length} misión(es) programada(s)`}
        >
          {missions.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-navy-200 p-6 text-center text-sm text-navy-400">
              Sin misiones programadas para hoy.
            </div>
          ) : (
            <div className="space-y-2">
              {missions.map((m) => {
                const statusMeta = MISSION_STATUS_META[m.status] || MISSION_STATUS_META.programada;
                return (
                  <div key={m.id} className="bg-white rounded-xl border border-navy-100 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-navy">{m.name}</p>
                        <p className="text-xs text-navy-400">
                          {formatTime24(m.scheduled_at)} · {m.pic?.full_name || '—'} · {m.zone}
                        </p>
                        {m.aircraft && (
                          <p className="text-[11px] text-navy-300">
                            {m.aircraft.model?.brand} {m.aircraft.model?.model} — {m.aircraft.serial_number}
                          </p>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusMeta.soft}`}>{statusMeta.label}</span>
                    </div>
                    <div className="mt-1.5">
                      <WeatherBadge weather={weatherByMission[m.id]} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard icon="flight" tile="bg-emerald-500 text-white" wash="from-emerald-50 to-white" title="Estado de la flota" description={`${fleet.length} aeronave(s)`}>
          {fleet.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-navy-200 p-6 text-center text-sm text-navy-400">Sin aeronaves registradas.</div>
          ) : (
            <div className="space-y-2">
              {fleet.map((a) => {
                const statusMeta = AIRCRAFT_STATUS_META[a.operational_status] || AIRCRAFT_STATUS_META.disponible;
                return (
                  <div key={a.id} className="flex items-center justify-between gap-2 bg-white rounded-xl border border-navy-100 px-3 py-2 text-xs">
                    <span className="font-bold text-navy">
                      {a.model?.brand} {a.model?.model} — {a.serial_number}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-navy-500">
                      <span className={`w-2 h-2 rounded-full ${statusMeta.dot}`} />
                      {statusMeta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {maintenanceAircraft > 0 && (
            <p className="text-[11px] text-amber-600 font-semibold mt-3">{maintenanceAircraft} aeronave(s) en mantenimiento hoy.</p>
          )}
        </SectionCard>
      </div>

      <SectionCard icon="menu_book" tile="bg-blue-500 text-white" wash="from-blue-50 to-white" title="Vuelos registrados hoy" description={`${flights.length} vuelo(s)`}>
        {flights.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-navy-200 p-6 text-center text-sm text-navy-400">Sin vuelos registrados todavía hoy.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-navy-300 font-black uppercase tracking-widest">
                  <th className="py-1.5 pr-4">Despegue</th>
                  <th className="py-1.5 pr-4">Piloto</th>
                  <th className="py-1.5 pr-4">Aeronave</th>
                  <th className="py-1.5 pr-4">Duración</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {flights.map((f) => (
                  <tr key={f.id}>
                    <td className="py-1.5 pr-4 font-mono text-navy-600">{formatTime24(f.takeoff_at)}</td>
                    <td className="py-1.5 pr-4 font-bold text-navy">{f.pilot?.full_name || '—'}</td>
                    <td className="py-1.5 pr-4 text-navy-500">{f.aircraft ? `${f.aircraft.model?.brand} ${f.aircraft.model?.model}` : '—'}</td>
                    <td className="py-1.5 pr-4 font-black text-navy-700 tabular-nums">{Number(f.total_time).toFixed(1)}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
