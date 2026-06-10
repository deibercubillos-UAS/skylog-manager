'use client';
import { useState, useEffect, useCallback } from 'react';

// ── Umbrales RAC 100 por defecto ──────────────────────────────────────────────
const DEFAULT_THRESHOLDS = {
  windSpeed:   25,   // km/h máximo en superficie
  windGusts:   35,   // km/h ráfagas máximas
  visibility:  5000, // metros mínimos
  cloudcover:  80,   // % máximo
  precipitation: 0.1, // mm/h máximo
};

// WMO weather codes → descripción + icono
const WMO = {
  0:  { label: 'Despejado',          icon: 'sunny' },
  1:  { label: 'Mayormente despejado', icon: 'partly_cloudy_day' },
  2:  { label: 'Parcialmente nublado', icon: 'partly_cloudy_day' },
  3:  { label: 'Nublado',            icon: 'cloud' },
  45: { label: 'Niebla',             icon: 'foggy' },
  48: { label: 'Niebla con escarcha', icon: 'foggy' },
  51: { label: 'Llovizna leve',      icon: 'grain' },
  53: { label: 'Llovizna moderada',  icon: 'grain' },
  55: { label: 'Llovizna intensa',   icon: 'grain' },
  61: { label: 'Lluvia leve',        icon: 'rainy' },
  63: { label: 'Lluvia moderada',    icon: 'rainy' },
  65: { label: 'Lluvia intensa',     icon: 'rainy' },
  71: { label: 'Nieve leve',         icon: 'ac_unit' },
  80: { label: 'Chubascos leves',    icon: 'rainy' },
  81: { label: 'Chubascos moderados', icon: 'rainy' },
  82: { label: 'Chubascos intensos', icon: 'thunderstorm' },
  95: { label: 'Tormenta',           icon: 'thunderstorm' },
  99: { label: 'Tormenta con granizo', icon: 'thunderstorm' },
};

function getWmo(code) {
  return WMO[code] || { label: `Código ${code}`, icon: 'question_mark' };
}

// ── Evalúa si las condiciones permiten volar ──────────────────────────────────
function evaluate(current, hourly, idx, thr) {
  const issues = [];
  if (current.windspeed > thr.windSpeed)
    issues.push(`Viento ${current.windspeed} km/h (máx ${thr.windSpeed})`);
  if (hourly.windgusts_10m[idx] > thr.windGusts)
    issues.push(`Ráfagas ${hourly.windgusts_10m[idx]} km/h (máx ${thr.windGusts})`);
  if (hourly.visibility[idx] < thr.visibility)
    issues.push(`Visibilidad ${(hourly.visibility[idx]/1000).toFixed(1)} km (mín ${thr.visibility/1000} km)`);
  if (hourly.cloudcover[idx] > thr.cloudcover)
    issues.push(`Nubosidad ${hourly.cloudcover[idx]}% (máx ${thr.cloudcover}%)`);
  if (hourly.precipitation[idx] > thr.precipitation)
    issues.push(`Lluvia ${hourly.precipitation[idx]} mm/h`);
  return issues;
}

// ── Componente tarjeta de métrica ─────────────────────────────────────────────
function MetricCard({ icon, label, value, unit, ok }) {
  return (
    <div className={`rounded-xl p-4 flex flex-col gap-1 border ${
      ok === true  ? 'bg-green-950/40 border-green-800/40' :
      ok === false ? 'bg-red-950/40 border-red-800/40' :
                     'bg-slate-800/60 border-slate-700/40'
    }`}>
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-base text-slate-400">{icon}</span>
        <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">{label}</span>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-black text-white">{value}</span>
        <span className="text-xs text-slate-500 mb-1">{unit}</span>
      </div>
    </div>
  );
}

// ── Kp index → color + descripción ──────────────────────────────────────────
function kpInfo(kp) {
  if (kp === null || kp === undefined) return { color: 'text-slate-400', bg: 'bg-slate-700', label: 'Sin datos', gps: 'Desconocido' };
  if (kp <= 1)  return { color: 'text-green-400',  bg: 'bg-green-500',  label: `Kp ${kp} — Tranquilo`,          gps: 'GPS óptimo' };
  if (kp <= 3)  return { color: 'text-green-300',  bg: 'bg-green-400',  label: `Kp ${kp} — Levemente activo`,   gps: 'GPS sin impacto' };
  if (kp <= 4)  return { color: 'text-yellow-300', bg: 'bg-yellow-500', label: `Kp ${kp} — Activo`,             gps: 'Leve degradación GPS' };
  if (kp <= 5)  return { color: 'text-orange-300', bg: 'bg-orange-500', label: `Kp ${kp} — Tormenta G1`,        gps: 'GPS puede fallar' };
  return          { color: 'text-red-400',    bg: 'bg-red-500',    label: `Kp ${kp} — Tormenta G${Math.min(kp-4,5)}`, gps: 'GPS no confiable' };
}

// ── Barra de altitud (viento por altura) ──────────────────────────────────────
function AltBar({ label, value, max = 60 }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = value > 35 ? 'bg-red-500' : value > 20 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-16 text-right font-mono">{label}</span>
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-white w-16">{value} km/h</span>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function WeatherDevPage() {
  const [auth,   setAuth]   = useState('loading'); // 'loading' | 'ok' | 'denied'
  const [coords, setCoords] = useState({ lat: 4.7110, lon: -74.0721 });
  const [city,   setCity]   = useState('Bogotá');
  const [search, setSearch] = useState('');
  const [data,   setData]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,  setError]  = useState('');
  const [thr,    setThr]    = useState(DEFAULT_THRESHOLDS);
  const [showThr, setShowThr] = useState(false);

  // ── Guard superadmin ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/admin/master/weather-dev?lat=4.71&lon=-74.07')
      .then(r => {
        if (r.status === 403 || r.status === 401) { setAuth('denied'); return null; }
        setAuth('ok');
        return r.json();
      })
      .then(d => { if (d) setData(d); })
      .catch(() => setAuth('denied'));
  }, []);

  // ── Geolocalización ───────────────────────────────────────────────────────
  useEffect(() => {
    if (auth !== 'ok') return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {} // silencioso — usa Bogotá por defecto
    );
  }, [auth]);

  // ── Fetch clima ───────────────────────────────────────────────────────────
  const fetchWeather = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(
        `/api/admin/master/weather-dev?lat=${coords.lat}&lon=${coords.lon}`
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [coords]);

  useEffect(() => {
    if (auth === 'ok') fetchWeather();
  }, [auth, fetchWeather]);

  // ── Búsqueda de municipio via Nominatim ───────────────────────────────────
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search + ', Colombia')}&format=json&limit=1`
      );
      const results = await res.json();
      if (!results.length) { setError('Municipio no encontrado'); return; }
      const { lat, lon, display_name } = results[0];
      setCity(display_name.split(',')[0]);
      setCoords({ lat: parseFloat(lat), lon: parseFloat(lon) });
    } catch {
      setError('Error buscando ubicación');
    }
  };

  // ── Guards de estado ──────────────────────────────────────────────────────
  if (auth === 'loading') return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <span className="material-symbols-outlined animate-spin text-4xl text-slate-500">progress_activity</span>
    </div>
  );

  if (auth === 'denied') return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <span className="material-symbols-outlined text-5xl text-red-500">block</span>
        <p className="text-white font-black mt-3">Acceso denegado</p>
        <p className="text-slate-500 text-sm mt-1">Solo superadmin</p>
      </div>
    </div>
  );

  // ── Cálculo del índice actual ─────────────────────────────────────────────
  const currentIdx = data ? (() => {
    const now = new Date();
    const hours = data.hourly.time.map(t => new Date(t));
    return hours.findIndex(h => h >= now) || 0;
  })() : 0;

  // Índice del día actual en el array daily
  const todayIdx = data?.daily ? (() => {
    const today = new Date().toISOString().slice(0, 10);
    return Math.max(0, data.daily.time.findIndex(t => t === today));
  })() : 0;

  const sunrise = data?.daily?.sunrise?.[todayIdx]
    ? new Date(data.daily.sunrise[todayIdx]).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '--:--';
  const sunset = data?.daily?.sunset?.[todayIdx]
    ? new Date(data.daily.sunset[todayIdx]).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '--:--';
  const daylightHrs = data?.daily?.daylight_duration?.[todayIdx]
    ? (data.daily.daylight_duration[todayIdx] / 3600).toFixed(1)
    : null;

  const kp = data?.kp?.current;
  const kpVal = kp?.kp ?? null;
  const kpMeta = kpInfo(kpVal);

  const issues = data
    ? evaluate(data.current_weather, data.hourly, currentIdx, thr)
    : [];

  const canFly = data && issues.length === 0;
  const wmo = data ? getWmo(data.current_weather.weathercode) : null;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500 mb-0.5">
              Bitafly · Dev Sandbox
            </p>
            <h1 className="text-3xl font-black uppercase tracking-tight">
              Módulo Clima UAV
            </h1>
            <p className="text-slate-500 text-xs font-bold uppercase mt-0.5">
              Fase 1 · Solo superadmin · No afecta producción
            </p>
          </div>
          <button
            onClick={fetchWeather}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>
              {loading ? 'progress_activity' : 'sync'}
            </span>
            Actualizar
          </button>
        </div>

        {/* Búsqueda */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar municipio de Colombia..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-orange-500/60"
          />
          <button
            type="submit"
            className="bg-orange-600 hover:bg-orange-500 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={() => navigator.geolocation?.getCurrentPosition(
              p => setCoords({ lat: p.coords.latitude, lon: p.coords.longitude }),
              () => setError('Geolocalización no disponible')
            )}
            className="bg-slate-800 hover:bg-slate-700 px-3 py-2.5 rounded-xl transition-all"
            title="Usar mi ubicación"
          >
            <span className="material-symbols-outlined text-base text-slate-400">my_location</span>
          </button>
        </form>

        {error && (
          <div className="mb-4 bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {!data && loading && (
          <div className="flex items-center justify-center py-20">
            <span className="material-symbols-outlined animate-spin text-5xl text-slate-600">progress_activity</span>
          </div>
        )}

        {data && (
          <>
            {/* Semáforo principal */}
            <div className={`rounded-2xl p-6 mb-6 border-2 flex items-center gap-5 ${
              canFly
                ? 'bg-green-950/50 border-green-600/60'
                : 'bg-red-950/50 border-red-600/60'
            }`}>
              <span className={`material-symbols-outlined text-6xl ${
                canFly ? 'text-green-400' : 'text-red-400'
              }`}>
                {canFly ? 'check_circle' : 'cancel'}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className={`text-2xl font-black ${canFly ? 'text-green-300' : 'text-red-300'}`}>
                    {canFly ? 'APTO PARA VOLAR' : 'NO APTO PARA VOLAR'}
                  </span>
                  {wmo && (
                    <span className="flex items-center gap-1 text-slate-400 text-sm">
                      <span className="material-symbols-outlined text-sm">{wmo.icon}</span>
                      {wmo.label}
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-sm">
                  {city} · {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}
                  {' · '}{data.current_weather.temperature}°C
                </p>
                {issues.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {issues.map((iss, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs text-red-300">
                        <span className="material-symbols-outlined text-xs">warning</span>
                        {iss}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Métricas actuales */}
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
              Condiciones Actuales
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <MetricCard
                icon="air"
                label="Viento"
                value={data.current_weather.windspeed}
                unit="km/h"
                ok={data.current_weather.windspeed <= thr.windSpeed}
              />
              <MetricCard
                icon="mode_fan"
                label="Ráfagas"
                value={data.hourly.windgusts_10m[currentIdx]}
                unit="km/h"
                ok={data.hourly.windgusts_10m[currentIdx] <= thr.windGusts}
              />
              <MetricCard
                icon="visibility"
                label="Visibilidad"
                value={(data.hourly.visibility[currentIdx] / 1000).toFixed(1)}
                unit="km"
                ok={data.hourly.visibility[currentIdx] >= thr.visibility}
              />
              <MetricCard
                icon="cloud"
                label="Nubosidad"
                value={data.hourly.cloudcover[currentIdx]}
                unit="%"
                ok={data.hourly.cloudcover[currentIdx] <= thr.cloudcover}
              />
              <MetricCard
                icon="water_drop"
                label="Precipitación"
                value={data.hourly.precipitation[currentIdx]}
                unit="mm/h"
                ok={data.hourly.precipitation[currentIdx] <= thr.precipitation}
              />
              <MetricCard
                icon="thermostat"
                label="Temperatura"
                value={data.hourly.temperature_2m[currentIdx]}
                unit="°C"
              />
              <MetricCard
                icon="wb_twilight"
                label="Amanecer"
                value={sunrise}
                unit="horas"
              />
              <MetricCard
                icon="wb_sunny"
                label="Atardecer"
                value={sunset}
                unit={daylightHrs ? `${daylightHrs}h luz` : 'horas'}
              />
            </div>

            {/* Viento por altitud */}
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
              Viento por Altitud (como UAV Forecast)
            </h2>
            <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/40 mb-6 space-y-3">
              <AltBar label="10 m (SFC)" value={data.hourly.windspeed_10m[currentIdx]} />
              <AltBar label="80 m"       value={data.hourly.windspeed_80m[currentIdx]} />
              <AltBar label="120 m"      value={data.hourly.windspeed_120m[currentIdx]} />
              <AltBar label="180 m"      value={data.hourly.windspeed_180m[currentIdx]} />
            </div>

            {/* Índice Kp solar */}
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
              Índice Kp Solar — Impacto en GPS del Drone
            </h2>
            <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/40 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black border-2 ${
                  kpVal === null ? 'border-slate-600 text-slate-400' :
                  kpVal <= 3    ? 'border-green-600/60 text-green-300 bg-green-950/40' :
                  kpVal <= 4    ? 'border-yellow-600/60 text-yellow-300 bg-yellow-950/40' :
                                  'border-red-600/60 text-red-300 bg-red-950/40'
                }`}>
                  {kpVal !== null ? kpVal.toFixed(1) : '—'}
                </div>
                <div>
                  <p className={`text-lg font-black ${kpMeta.color}`}>{kpMeta.label}</p>
                  <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="material-symbols-outlined text-sm">satellite_alt</span>
                    {kpMeta.gps}
                  </p>
                  {kp?.time && (
                    <p className="text-xs text-slate-600 mt-1">
                      Fuente: NOAA · {new Date(kp.time).toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                      {kp.status && ` · ${kp.status}`}
                    </p>
                  )}
                </div>
              </div>

              {/* Mini gráfica Kp últimas 24h */}
              {data?.kp?.forecast?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">Últimas 24h</p>
                  <div className="flex items-end gap-1 h-12">
                    {data.kp.forecast.map((row, i) => {
                      const pct = Math.min((row.kp / 9) * 100, 100);
                      const bg = row.kp <= 3 ? 'bg-green-500' : row.kp <= 4 ? 'bg-yellow-500' : 'bg-red-500';
                      const hour = new Date(row.time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${hour} — Kp ${row.kp}`}>
                          <div className="w-full flex items-end" style={{ height: '36px' }}>
                            <div className={`w-full rounded-t ${bg}`} style={{ height: `${Math.max(pct, 4)}%` }} />
                          </div>
                          <span className="text-[9px] text-slate-600 rotate-0 leading-none">{row.kp.toFixed(0)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-slate-600">
                      {data.kp.forecast[0]?.time ? new Date(data.kp.forecast[0].time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                    </span>
                    <span className="text-[9px] text-slate-600">Ahora</span>
                  </div>
                </div>
              )}

              {/* Escala referencia */}
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[
                  { range: '0–3', label: 'Tranquilo', color: 'bg-green-500' },
                  { range: '4',   label: 'Activo',    color: 'bg-yellow-500' },
                  { range: '5',   label: 'G1 Storm',  color: 'bg-orange-500' },
                  { range: '6+',  label: 'G2+ Storm', color: 'bg-red-500' },
                ].map(s => (
                  <div key={s.range} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${s.color} flex-shrink-0`} />
                    <span className="text-[10px] text-slate-400"><span className="font-bold">{s.range}</span> {s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline próximas 12h */}
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
              Próximas 12 Horas
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
              {Array.from({ length: 12 }, (_, i) => currentIdx + i).map((idx) => {
                if (idx >= data.hourly.time.length) return null;
                const slotIssues = evaluate(
                  { windspeed: data.hourly.windspeed_10m[idx] },
                  data.hourly, idx, thr
                );
                const ok = slotIssues.length === 0;
                const hour = new Date(data.hourly.time[idx]).toLocaleTimeString('es-CO', {
                  hour: '2-digit', minute: '2-digit', hour12: false,
                });
                const wmoSlot = getWmo(data.hourly.weathercode ? data.hourly.weathercode[idx] : 0);
                return (
                  <div
                    key={idx}
                    className={`flex-shrink-0 w-20 rounded-xl p-3 text-center border ${
                      ok
                        ? 'bg-green-950/40 border-green-800/40'
                        : 'bg-red-950/40 border-red-800/40'
                    }`}
                  >
                    <p className="text-xs text-slate-400 font-bold mb-1">{hour}</p>
                    <span className="material-symbols-outlined text-xl text-slate-300">
                      {wmoSlot.icon}
                    </span>
                    <p className="text-xs font-black text-white mt-1">
                      {data.hourly.windspeed_10m[idx]}<span className="text-slate-500"> km/h</span>
                    </p>
                    <div className={`mt-1.5 h-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
                  </div>
                );
              })}
            </div>

            {/* Umbrales configurables */}
            <div className="border border-slate-700/40 rounded-2xl overflow-hidden mb-6">
              <button
                onClick={() => setShowThr(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 bg-slate-800/60 hover:bg-slate-800 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-slate-400">tune</span>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-300">
                    Umbrales configurables
                  </span>
                </div>
                <span className="material-symbols-outlined text-base text-slate-500">
                  {showThr ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {showThr && (
                <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-900/40">
                  {[
                    { key: 'windSpeed',    label: 'Viento máx (km/h)',    min: 5,  max: 60 },
                    { key: 'windGusts',    label: 'Ráfagas máx (km/h)',   min: 5,  max: 80 },
                    { key: 'cloudcover',   label: 'Nubosidad máx (%)',    min: 10, max: 100 },
                  ].map(({ key, label, min, max }) => (
                    <div key={key}>
                      <label className="text-xs text-slate-500 font-bold uppercase tracking-widest block mb-1">
                        {label}: <span className="text-white">{thr[key]}</span>
                      </label>
                      <input
                        type="range" min={min} max={max} value={thr[key]}
                        onChange={e => setThr(t => ({ ...t, [key]: +e.target.value }))}
                        className="w-full accent-orange-500"
                      />
                    </div>
                  ))}
                  {[
                    { key: 'visibility',   label: 'Visibilidad mín (m)',   min: 500,  max: 10000, step: 500 },
                  ].map(({ key, label, min, max, step }) => (
                    <div key={key}>
                      <label className="text-xs text-slate-500 font-bold uppercase tracking-widest block mb-1">
                        {label}: <span className="text-white">{thr[key]}</span>
                      </label>
                      <input
                        type="range" min={min} max={max} step={step} value={thr[key]}
                        onChange={e => setThr(t => ({ ...t, [key]: +e.target.value }))}
                        className="w-full accent-orange-500"
                      />
                    </div>
                  ))}
                  <div className="col-span-2 md:col-span-3">
                    <button
                      onClick={() => setThr(DEFAULT_THRESHOLDS)}
                      className="text-xs text-slate-400 hover:text-orange-400 font-bold uppercase tracking-widest transition-colors"
                    >
                      Restaurar defaults RAC 100
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Fuente */}
            <p className="text-center text-xs text-slate-600">
              Datos: Open-Meteo (GFS/ECMWF) · Cache 30 min ·{' '}
              <span className="text-slate-500">Fase 1 de 4</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
