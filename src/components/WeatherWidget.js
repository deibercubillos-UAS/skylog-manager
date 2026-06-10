'use client';
import { useState, useEffect } from 'react';

// Gauge circular SVG — 60x60
function MiniGauge({ score }) {
  const R = 22, C = 2 * Math.PI * R;
  const fill  = C * (score / 100);
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#84cc16' : score >= 40 ? '#eab308' : '#ef4444';
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" className="flex-shrink-0">
      <circle cx="30" cy="30" r={R} fill="none" stroke="#1e293b" strokeWidth="6" />
      <circle cx="30" cy="30" r={R} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${fill} ${C - fill}`}
        strokeDashoffset={C / 4}
        strokeLinecap="round"
      />
      <text x="30" y="34" textAnchor="middle" fill="white" fontSize="13" fontWeight="900">{score}</text>
    </svg>
  );
}

/*
 * WeatherWidget — muestra condiciones actuales para un punto (lat/lon).
 *
 * Props:
 *   lat, lon      — coordenadas del punto de vuelo (requeridos)
 *   label         — texto descriptivo de la ubicación (opcional)
 *   compact       — true = solo score + semáforo inline, sin detalles
 *   className     — clases adicionales para el contenedor
 */
export default function WeatherWidget({ lat, lon, label, compact = false, className = '' }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!lat || !lon) return;
    setLoading(true);
    setError('');
    fetch(`/api/weather/current?lat=${lat}&lon=${lon}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [lat, lon]);

  if (!lat || !lon) return null;

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-slate-500 text-xs ${className}`}>
        <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
        Cargando clima…
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-1.5 text-slate-500 text-xs ${className}`}>
        <span className="material-symbols-outlined text-sm">cloud_off</span>
        Sin datos de clima
      </div>
    );
  }

  if (!data) return null;

  // ── Modo compacto: badge inline ─────────────────────────────────────────────
  if (compact) {
    const color = data.canFly ? 'text-green-400' : 'text-red-400';
    const bg    = data.canFly ? 'bg-green-950/60 border-green-800/40' : 'bg-red-950/60 border-red-800/40';
    return (
      <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 border text-xs font-bold ${bg} ${className}`}>
        <span className={`material-symbols-outlined text-sm ${color}`}>
          {data.canFly ? 'check_circle' : 'cancel'}
        </span>
        <span className={color}>{data.canFly ? 'APTO' : 'NO APTO'}</span>
        <span className="text-slate-500">·</span>
        <span className="material-symbols-outlined text-sm text-slate-400">{data.current.icon}</span>
        <span className="text-slate-300">{data.current.windspeed} km/h</span>
        <span className="text-slate-500">·</span>
        <span className="text-slate-300">{data.current.temperature}°C</span>
      </div>
    );
  }

  // ── Modo completo ────────────────────────────────────────────────────────────
  const canFly = data.canFly;
  const borderCls = canFly
    ? 'border-green-800/40 bg-green-950/30'
    : 'border-red-800/40 bg-red-950/30';

  return (
    <div className={`rounded-2xl border p-4 ${borderCls} ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <MiniGauge score={data.score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-black uppercase ${canFly ? 'text-green-300' : 'text-red-300'}`}>
              {canFly ? 'Apto para volar' : 'No apto para volar'}
            </span>
            <span className="flex items-center gap-1 text-slate-400 text-xs">
              <span className="material-symbols-outlined text-xs">{data.current.icon}</span>
              {data.current.label}
            </span>
          </div>
          {label && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              <span className="material-symbols-outlined text-[11px] mr-0.5">location_on</span>
              {label}
            </p>
          )}
          {data.issues.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {data.issues.map((iss, i) => (
                <li key={i} className="flex items-center gap-1 text-[11px] text-red-400">
                  <span className="material-symbols-outlined text-[11px]">warning</span>
                  {iss}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Métricas clave */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { icon: 'air',        val: `${data.current.windspeed}`,                   unit: 'km/h',  label: 'Viento',  bad: data.current.windspeed > 25 },
          { icon: 'mode_fan',   val: `${data.hourly.gusts}`,                         unit: 'km/h',  label: 'Ráfagas', bad: data.hourly.gusts > 35 },
          { icon: 'visibility', val: `${(data.hourly.visibility/1000).toFixed(1)}`,  unit: 'km',    label: 'Visib.',  bad: data.hourly.visibility < 5000 },
          { icon: 'rainy',      val: `${data.hourly.precipitationProbability}`,      unit: '%',     label: 'Lluvia',  bad: data.hourly.precipitationProbability >= 50 },
        ].map(m => (
          <div key={m.label} className={`rounded-lg p-2 ${m.bad ? 'bg-red-950/50' : 'bg-slate-800/60'}`}>
            <span className={`material-symbols-outlined text-sm block ${m.bad ? 'text-red-400' : 'text-slate-400'}`}>{m.icon}</span>
            <p className={`text-sm font-black ${m.bad ? 'text-red-300' : 'text-white'}`}>{m.val}</p>
            <p className="text-[10px] text-slate-600">{m.unit}</p>
            <p className="text-[9px] text-slate-600 uppercase tracking-wide">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Kp + temperatura */}
      <div className="flex items-center justify-between mt-2.5 text-[10px] text-slate-600">
        <span>
          {data.current.temperature !== null && `${data.current.temperature}°C`}
          {data.hourly.humidity !== null && ` · ${data.hourly.humidity}% HR`}
        </span>
        {data.kp !== null && (
          <span className={data.kp <= 3 ? 'text-green-600' : data.kp <= 5 ? 'text-yellow-600' : 'text-red-600'}>
            Kp {data.kp?.toFixed(1)} · GPS {data.kp <= 3 ? 'óptimo' : data.kp <= 5 ? 'degradado' : 'no confiable'}
          </span>
        )}
      </div>
    </div>
  );
}
