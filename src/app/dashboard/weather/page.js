'use client';
import { useState, useEffect, useCallback } from 'react';
import PageHero from '@/components/PageHero';

// Bogotá D.C. como ubicación por defecto si el usuario no comparte su ubicación.
const DEFAULT = { lat: 4.711, lon: -74.0721, label: 'Bogotá D.C.' };

// Mismos umbrales que /api/weather/current — para colorear las tarjetas de condiciones actuales.
const THR = { windSpeed: 25, windGusts: 35, visibility: 5000, precipitationProb: 50 };

// Extrae lat/lon del primer punto de una zona (mismo patrón que logbook/new y BasicForm —
// plan_data.points puede venir como [lat, lon] o { lat, lng/lon }).
function firstCoord(points) {
  const p = Array.isArray(points) && points[0];
  if (!p) return null;
  const lat = Array.isArray(p) ? p[0] : p.lat;
  const lon = Array.isArray(p) ? p[1] : (p.lng ?? p.lon);
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  return { lat, lon };
}

const statusStyle = {
  GO:          { label: 'GO',        icon: 'check_circle', cls: 'text-emerald-600' },
  'Precaución': { label: 'Precaución', icon: 'warning',      cls: 'text-amber-600' },
  'NO-GO':     { label: 'NO-GO',     icon: 'cancel',        cls: 'text-red-600' },
};

export default function WeatherPage() {
  const [coords, setCoords] = useState(DEFAULT);
  const [geoState, setGeoState] = useState('idle'); // idle | locating | granted | denied

  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);

  const [zones, setZones] = useState([]);
  const [loadingZones, setLoadingZones] = useState(true);

  const locate = () => {
    if (!navigator.geolocation) { setGeoState('denied'); return; }
    setGeoState('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: 'Mi ubicación' });
        setGeoState('granted');
      },
      () => setGeoState('denied'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  };

  // Intentar ubicar automáticamente al montar (sin bloquear si el usuario niega).
  useEffect(() => { locate(); }, []);

  // Condiciones actuales + pronóstico horario del punto seleccionado.
  useEffect(() => {
    setLoadingWeather(true);
    fetch(`/api/weather/current?lat=${coords.lat}&lon=${coords.lon}`)
      .then(r => r.json())
      .then(d => setWeather(d.error ? null : d))
      .catch(() => setWeather(null))
      .finally(() => setLoadingWeather(false));
  }, [coords.lat, coords.lon]);

  // Zonas de operación programadas hoy: misiones autorizadas de la org con zona definida,
  // con el clima real de cada punto (reutiliza /api/weather/current, sin backend nuevo).
  const loadZonesToday = useCallback(async () => {
    setLoadingZones(true);
    try {
      const res = await fetch('/api/flights/authorize');
      const auths = await res.json();
      const todayISO = new Date().toISOString().slice(0, 10);
      const todays = (Array.isArray(auths) ? auths : []).filter(a =>
        a.status !== 'cancelado' &&
        String(a.scheduled_at || '').slice(0, 10) === todayISO &&
        firstCoord(a.plan_data?.points)
      );

      const withWeather = await Promise.all(todays.map(async (a) => {
        const c = firstCoord(a.plan_data.points);
        try {
          const r = await fetch(`/api/weather/current?lat=${c.lat}&lon=${c.lon}`);
          const d = await r.json();
          if (d.error) throw new Error(d.error);
          const status = d.canFly ? 'GO' : (d.score >= 50 ? 'Precaución' : 'NO-GO');
          return {
            id: a.id,
            zone: a.location || a.plan_data?.op_name || a.mission_id,
            mission: a.plan_data?.op_name || a.mission_type || a.mission_id,
            takeoffTime: a.plan_data?.takeoff_time || null,
            wind: `${d.current.windspeed} km/h`,
            visibility: `${(d.hourly.visibility / 1000).toFixed(1)} km`,
            precip: `${d.hourly.precipitationProbability}%`,
            status,
          };
        } catch {
          return {
            id: a.id,
            zone: a.location || a.plan_data?.op_name || a.mission_id,
            mission: a.plan_data?.op_name || a.mission_type || a.mission_id,
            takeoffTime: a.plan_data?.takeoff_time || null,
            wind: '—', visibility: '—', precip: '—', status: null,
          };
        }
      }));
      setZones(withWeather);
    } catch {
      setZones([]);
    } finally {
      setLoadingZones(false);
    }
  }, []);

  useEffect(() => { loadZonesToday(); }, [loadZonesToday]);

  const canFly = weather?.canFly ?? null;

  return (
    <div className="max-w-6xl mx-auto space-y-5 text-left animate-in fade-in duration-500 pb-20">
      <PageHero
        eyebrow="Operación"
        title="Meteorología"
        description="Condiciones en tiempo real y pronóstico para decidir ventanas de vuelo seguras."
        right={
          !loadingWeather && canFly !== null ? (
            <div className={`flex items-center gap-2.5 rounded-xl px-5 py-2.5 border ${
              canFly ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
            }`}>
              <span className={`material-symbols-outlined text-lg ${canFly ? 'text-emerald-400' : 'text-red-400'}`}>
                {canFly ? 'flight_takeoff' : 'cancel'}
              </span>
              <span className={`text-xs font-black uppercase tracking-wide ${canFly ? 'text-emerald-400' : 'text-red-400'}`}>
                {canFly ? 'GO — condiciones favorables' : 'NO-GO — revisar condiciones'}
              </span>
            </div>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-orange-500">location_on</span>
          {coords.label}
          {geoState === 'denied' && <span className="text-slate-300 normal-case font-medium">(ubicación no disponible — mostrando Bogotá)</span>}
        </p>
        <button
          onClick={locate}
          disabled={geoState === 'locating'}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-xs font-black uppercase text-slate-500 hover:text-orange-600 hover:border-orange-300 transition-all disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-sm">{geoState === 'locating' ? 'hourglass_empty' : 'my_location'}</span>
          {geoState === 'locating' ? 'Ubicando...' : 'Usar mi ubicación'}
        </button>
      </div>

      {loadingWeather ? (
        <div className="p-16 text-center text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">
          Cargando condiciones…
        </div>
      ) : !weather ? (
        <div className="bg-white rounded-[2rem] border border-slate-200 p-16 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-200">cloud_off</span>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-4">Sin datos de clima disponibles</p>
        </div>
      ) : (
        <>
          {/* Condiciones actuales — 6 métricas reales */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                label: 'Viento', icon: 'air', val: weather.current.windspeed, unit: 'km/h',
                bad: weather.current.windspeed > THR.windSpeed,
                status: weather.current.windspeed > THR.windSpeed ? `Sobre límite (${THR.windSpeed})` : `Dentro de límite (< ${THR.windSpeed})`,
              },
              {
                label: 'Ráfagas', icon: 'storm', val: weather.hourly.gusts, unit: 'km/h',
                bad: weather.hourly.gusts > THR.windGusts,
                status: weather.hourly.gusts > THR.windGusts ? `Sobre límite (${THR.windGusts})` : 'Aceptable',
              },
              {
                label: 'Visibilidad', icon: 'visibility', val: (weather.hourly.visibility / 1000).toFixed(1), unit: 'km',
                bad: weather.hourly.visibility < THR.visibility,
                status: weather.hourly.visibility < THR.visibility ? 'Reducida' : 'Excelente',
              },
              {
                label: 'Precipitación', icon: 'water_drop', val: weather.hourly.precipitationProbability, unit: '%',
                bad: weather.hourly.precipitationProbability >= THR.precipitationProb,
                status: weather.hourly.precipitationProbability >= THR.precipitationProb ? 'Prob. de lluvia' : 'Sin lluvia',
              },
              {
                label: 'Temperatura', icon: 'thermostat', val: weather.current.temperature ?? '—', unit: '°C',
                bad: false, status: 'Óptima',
              },
              {
                label: 'Índice Kp', icon: 'radar', val: weather.kp !== null ? weather.kp.toFixed(1) : '—', unit: '/9',
                bad: weather.kp !== null && weather.kp > 5,
                status: weather.kp === null ? 'Sin datos' : weather.kp <= 3 ? 'GPS/RTK estable' : weather.kp <= 5 ? 'GPS degradado' : 'GPS no confiable',
              },
            ].map(c => (
              <div key={c.label} className="bg-white border border-slate-200 rounded-2xl p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-black uppercase tracking-wide text-slate-400">{c.label}</span>
                  <span className={`material-symbols-outlined text-base ${c.bad ? 'text-red-500' : 'text-slate-400'}`}>{c.icon}</span>
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-xl font-black text-slate-900 tabular-nums">{c.val}</span>
                  <span className="text-[11px] font-bold text-slate-400">{c.unit}</span>
                </div>
                <p className={`text-[10px] font-bold mt-1 ${c.bad ? 'text-red-600' : 'text-emerald-600'}`}>{c.status}</p>
              </div>
            ))}
          </div>

          {/* Pronóstico horario — hoy */}
          {weather.todayHourly?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5">
              <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 mb-3">Pronóstico horario — hoy</p>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {weather.todayHourly.map((hr, i) => {
                  const st = statusStyle[hr.go] || statusStyle.GO;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                      <span className="text-[10px] font-bold text-slate-400">{hr.time}</span>
                      <span className="material-symbols-outlined text-2xl text-slate-500">{hr.icon}</span>
                      <span className="text-xs font-black text-slate-900">{hr.temperature !== null ? `${Math.round(hr.temperature)}°` : '—'}</span>
                      <span className="text-[9.5px] font-bold text-slate-500">{hr.windspeed} km/h</span>
                      <span className={`text-[8.5px] font-black uppercase tracking-wide ${st.cls}`}>{st.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Zonas de operación programadas hoy */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="text-[11px] font-black uppercase tracking-wide text-orange-600">Zonas de operación programadas hoy</p>
          <a href="/dashboard/authorizations" className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-orange-600 transition-colors">
            Ver programación
            <span className="material-symbols-outlined text-base text-slate-400">chevron_right</span>
          </a>
        </div>

        {loadingZones ? (
          <div className="p-10 text-center text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">Cargando zonas…</div>
        ) : zones.length === 0 ? (
          <div className="p-10 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-200">flight_takeoff</span>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3">Sin misiones programadas con zona definida para hoy</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[720px]">
              <thead>
                <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                  <th className="px-5 py-3">Zona / misión</th>
                  <th className="px-3 py-3">Despegue</th>
                  <th className="px-3 py-3">Viento</th>
                  <th className="px-3 py-3">Visibilidad</th>
                  <th className="px-3 py-3">Precipitación</th>
                  <th className="px-3 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {zones.map(z => {
                  const st = z.status ? statusStyle[z.status] : null;
                  return (
                    <tr key={z.id} className="hover:bg-slate-50/60 transition-colors text-xs">
                      <td className="px-5 py-3">
                        <p className="font-black text-slate-900 truncate max-w-[220px]">{z.zone || '—'}</p>
                        <p className="text-slate-400 font-medium truncate max-w-[220px]">{z.mission}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{z.takeoffTime || '—'}</td>
                      <td className="px-3 py-3 text-slate-600">{z.wind}</td>
                      <td className="px-3 py-3 text-slate-600">{z.visibility}</td>
                      <td className="px-3 py-3 text-slate-600">{z.precip}</td>
                      <td className="px-3 py-3">
                        {st ? (
                          <span className={`flex items-center gap-1 font-black ${st.cls}`}>
                            <span className="material-symbols-outlined text-sm">{st.icon}</span>
                            {st.label}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
