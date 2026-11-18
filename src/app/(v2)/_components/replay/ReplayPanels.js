'use client';

// Paneles del replay: instrumentos, GPS y enlace, palancas, batería, clima y alertas. Cada uno recibe la muestra del instante
// actual (`s`) y solo se muestra si el log trajo ese dato (`has`).
import { useState } from 'react';
import { describeFlightMode, describeGoHomeStatus, describeEvent, weatherCodeText, sampleAt, formatCoordinates } from '@skylog/domain';

export const fmtClock = (s) => {
  if (s == null || Number.isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};
const f1 = (v, d = 1) => (v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(d));

export function Card({ title, icon, children, className = '' }) {
  return (
    <section className={`bg-white/5 border border-white/10 rounded-xl p-3 ${className}`}>
      <h4 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-navy-300 mb-2">
        {icon && <span className="material-symbols-outlined text-sm text-primary-300">{icon}</span>}
        {title}
      </h4>
      {children}
    </section>
  );
}

function Stat({ label, value, unit, tone }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-wide text-navy-300 truncate">{label}</p>
      <p className={`text-base font-black tabular-nums leading-tight ${tone || 'text-white'}`}>
        {value}
        {unit && <span className="text-[10px] font-bold text-navy-300 ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}

function Bars({ value, max = 5, color }) {
  return (
    <div className="flex items-end gap-0.5 h-5" aria-hidden>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className="w-1.5 rounded-sm" style={{ height: `${40 + i * 15}%`, background: i < value ? color : 'rgba(255,255,255,.15)' }} />
      ))}
    </div>
  );
}

// ── Instrumentos de vuelo ──
function Horizon({ pitch = 0, roll = 0 }) {
  return (
    <svg viewBox="0 0 100 100" className="w-20 h-20 shrink-0" role="img" aria-label={`Horizonte artificial: cabeceo ${f1(pitch, 0)}°, alabeo ${f1(roll, 0)}°`}>
      <defs><clipPath id="hz"><circle cx="50" cy="50" r="46" /></clipPath></defs>
      <g clipPath="url(#hz)">
        <g transform={`rotate(${-roll} 50 50) translate(0 ${pitch * 1.3})`}>
          <rect x="-50" y="-100" width="200" height="150" fill="#2b6cb0" />
          <rect x="-50" y="50" width="200" height="150" fill="#8a5a2b" />
          <line x1="-50" y1="50" x2="150" y2="50" stroke="#fff" strokeWidth="1.5" />
        </g>
      </g>
      <circle cx="50" cy="50" r="46" fill="none" stroke="#94a3b8" strokeWidth="3" />
      <path d="M30 50h14M56 50h14M50 50v0" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="50" r="2.5" fill="#f59e0b" />
    </svg>
  );
}

function Compass({ yaw = 0 }) {
  const heading = ((yaw % 360) + 360) % 360;
  return (
    <svg viewBox="0 0 100 100" className="w-20 h-20 shrink-0" role="img" aria-label={`Rumbo ${Math.round(heading)}°`}>
      <circle cx="50" cy="50" r="46" fill="#0b1220" stroke="#94a3b8" strokeWidth="3" />
      <g transform={`rotate(${-heading} 50 50)`}>
        {['N', 'E', 'S', 'O'].map((c, i) => (
          <text key={c} x="50" y="17" textAnchor="middle" fontSize="11" fontWeight="800" fill={c === 'N' ? '#ef4444' : '#cbd5e1'} transform={`rotate(${i * 90} 50 50)`}>{c}</text>
        ))}
        {Array.from({ length: 24 }, (_, i) => <line key={i} x1="50" y1="24" x2="50" y2={i % 6 === 0 ? 29 : 27} stroke="#64748b" strokeWidth="1" transform={`rotate(${i * 15} 50 50)`} />)}
      </g>
      <polygon points="50,28 44,56 50,50 56,56" fill="#EC5B13" />
      <text x="50" y="76" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">{Math.round(heading)}°</text>
    </svg>
  );
}

export function InstrumentsPanel({ s, has, modes, ghs }) {
  const mode = s.mo != null ? describeFlightMode(modes[s.mo]) : null;
  const gh = s.gh != null && ghs[s.gh] && ghs[s.gh] !== 'Standby' ? describeGoHomeStatus(ghs[s.gh]) : null;
  return (
    <Card title="Instrumentos" icon="speed">
      <div className="flex items-center gap-3">
        <Horizon pitch={s.pit || 0} roll={s.rol || 0} />
        <Compass yaw={s.yaw || 0} />
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 flex-1 min-w-0">
          <Stat label="Altura" value={f1(s.alt)} unit="m" />
          <Stat label="Vel. horizontal" value={f1(s.spd)} unit="m/s" />
          {has.vs && <Stat label="Vel. vertical" value={f1(s.vs)} unit="m/s" />}
          {has.dh && <Stat label="Dist. a casa" value={f1(s.dh, 0)} unit="m" />}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
        {mode && <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary-200">{mode}</span>}
        {gh && <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200">RTH: {gh}</span>}
        {has.mot && <span className={`px-2 py-0.5 rounded-full ${s.mot ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/10 text-navy-300'}`}>Motores {s.mot ? 'encendidos' : 'apagados'}</span>}
        {has.gnd && <span className="px-2 py-0.5 rounded-full bg-white/10 text-navy-200">{s.gnd ? 'En tierra' : 'En el aire'}</span>}
        {has.rec && s.rec ? <span className="px-2 py-0.5 rounded-full bg-red-500/25 text-red-200 flex items-center gap-1"><span className="size-1.5 rounded-full bg-red-400 animate-pulse" />Grabando</span> : null}
        {has.gp && <span className="px-2 py-0.5 rounded-full bg-white/10 text-navy-200">Cámara {f1(s.gp, 0)}°</span>}
      </div>
    </Card>
  );
}

function CopyButton({ text, label }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" aria-label={label} title={label} onClick={() => { navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {}); }} className="shrink-0 size-7 rounded-md bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
      <span className="material-symbols-outlined text-sm">{done ? 'check' : 'content_copy'}</span>
    </button>
  );
}

function CoordRow({ title, lat, lng, live }) {
  const c = formatCoordinates(lat, lng);
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wide text-navy-300">{title}</p>
        <p className={`text-sm font-black tabular-nums text-white ${live ? 'text-primary-200' : ''}`}>{c.decimal}</p>
        <p className="text-[11px] tabular-nums text-navy-200">{c.dms}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        <CopyButton text={c.signed} label="Copiar coordenadas" />
        <a href={`https://www.google.com/maps?q=${c.signed.replace(' ', '')}`} target="_blank" rel="noopener noreferrer" className="size-7 rounded-md bg-white/10 hover:bg-white/20 text-white flex items-center justify-center" aria-label="Abrir en un mapa" title="Abrir en un mapa"><span className="material-symbols-outlined text-sm">open_in_new</span></a>
      </div>
    </div>
  );
}

/** Ubicación en grados: la del dron en este instante (se mueve con el replay), el despegue y el punto de origen (casa). */
export function LocationPanel({ s, points, home }) {
  const first = points[0];
  return (
    <Card title="Ubicación (grados)" icon="location_on">
      <div className="space-y-2.5">
        <CoordRow title="Posición del dron ahora" lat={s.lat} lng={s.lng} live />
        <CoordRow title="Despegue" lat={first.lat} lng={first.lng} />
        {home && (Math.abs(home.lat - first.lat) > 1e-6 || Math.abs(home.lng - first.lng) > 1e-6) && <CoordRow title="Punto de origen (casa)" lat={home.lat} lng={home.lng} />}
      </div>
      <p className="text-[10px] text-navy-300 mt-2">Grados decimales y grados-minutos-segundos (sistema WGS84). El botón copia «latitud, longitud» para pegarla en cualquier mapa.</p>
    </Card>
  );
}

export function GpsLinkPanel({ s, has }) {
  if (!has.sat && !has.ds && !has.us) return null;
  const satTone = s.sat == null ? 'text-white' : s.sat >= 10 ? 'text-emerald-300' : s.sat >= 6 ? 'text-amber-300' : 'text-red-300';
  const sigTone = (v) => (v == null ? 'text-white' : v >= 60 ? 'text-emerald-300' : v >= 30 ? 'text-amber-300' : 'text-red-300');
  const sigColor = (v) => (v >= 60 ? '#34d399' : v >= 30 ? '#fbbf24' : '#f87171');
  return (
    <Card title="GPS y conexión con el control" icon="satellite_alt">
      <div className="grid grid-cols-3 gap-3">
        {has.sat && (
          <div>
            <Stat label="Satélites GPS" value={s.sat ?? '—'} tone={satTone} />
            {has.gl && <Bars value={Math.round(s.gl ?? 0)} color="#34d399" />}
          </div>
        )}
        {has.ds && (
          <div>
            <Stat label="Señal de bajada" value={f1(s.ds, 0)} unit="%" tone={sigTone(s.ds)} />
            <Bars value={Math.ceil(((s.ds ?? 0) / 100) * 5)} color={sigColor(s.ds)} />
          </div>
        )}
        {has.us && (
          <div>
            <Stat label="Señal de subida" value={f1(s.us, 0)} unit="%" tone={sigTone(s.us)} />
            <Bars value={Math.ceil(((s.us ?? 0) / 100) * 5)} color={sigColor(s.us)} />
          </div>
        )}
      </div>
      {has.ds && <p className="text-[10px] text-navy-300 mt-1.5">Bajada = video y datos del dron al control; subida = comandos del control al dron.</p>}
    </Card>
  );
}

export function StickPad({ label, x, y, trail, size = 'w-24 h-24', showLabel = true }) {
  const cx = (v) => 50 + (v ?? 0) * 40;
  const cy = (v) => 50 - (v ?? 0) * 40;
  return (
    <div className="text-center">
      <svg viewBox="0 0 100 100" className={`${size} mx-auto`} role="img" aria-label={`${label}: horizontal ${f1(x, 2)}, vertical ${f1(y, 2)}`}>
        <rect x="6" y="6" width="88" height="88" rx="16" fill="#0b1220" stroke="#475569" strokeWidth="2" />
        <path d="M50 8v84M8 50h84" stroke="#334155" strokeWidth="1" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="#334155" strokeDasharray="2 3" />
        {trail.length > 1 && <polyline points={trail.map((p) => `${cx(p.x)},${cy(p.y)}`).join(' ')} fill="none" stroke="#EC5B13" strokeOpacity=".6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
        <circle cx={cx(x)} cy={cy(y)} r="7" fill="#EC5B13" stroke="#fff" strokeWidth="2" />
      </svg>
      {showLabel && <p className="text-[10px] font-bold text-navy-200 mt-0.5">{label}</p>}
    </div>
  );
}

export const hasSticks = (has) => Boolean(has.ail || has.ele || has.thr || has.rud);

/** Estela de los últimos 1,5 s de una palanca (puntos x/y normalizados). */
export const stickTrail = (points, t, kx, ky) => Array.from({ length: 8 }, (_, i) => sampleAt(points, Math.max(0, t - 1.5 + (i * 1.5) / 7))).map((p) => ({ x: p?.[kx] ?? 0, y: p?.[ky] ?? 0 }));

/** Las dos palancas grandes sobre el mapa, como en la pantalla de la app de DJI. */
export function SticksOverlay({ s, points, t }) {
  return (
    <div className="pointer-events-none absolute bottom-8 inset-x-3 z-[500] flex items-end justify-between">
      <div className="bg-navy/60 backdrop-blur-sm rounded-2xl p-1.5"><StickPad label="Izquierda" x={s.rud} y={s.thr} trail={stickTrail(points, t, 'rud', 'thr')} size="w-20 h-20 sm:w-28 sm:h-28" showLabel={false} /></div>
      <div className="bg-navy/60 backdrop-blur-sm rounded-2xl p-1.5"><StickPad label="Derecha" x={s.ail} y={s.ele} trail={stickTrail(points, t, 'ail', 'ele')} size="w-20 h-20 sm:w-28 sm:h-28" showLabel={false} /></div>
    </div>
  );
}

export function SticksPanel({ s, has, points, t, legacy }) {
  if (!hasSticks(has)) {
    return (
      <Card title="Palancas del control" icon="gamepad">
        <p className="text-xs text-navy-300">
          {legacy
            ? 'Este replay se guardó con la versión anterior y no incluye el movimiento de las palancas, los satélites ni las alertas. Actualízalo con el archivo de log de este vuelo (botón «Actualizar replay») para verlos.'
            : 'El log de este vuelo no registró el movimiento de las palancas (algunos modelos o versiones de la app no lo guardan).'}
        </p>
      </Card>
    );
  }
  const trailOf = (kx, ky) => stickTrail(points, t, kx, ky);
  return (
    <Card title="Palancas del control" icon="gamepad">
      <div className="grid grid-cols-2 gap-2">
        <StickPad label="Izquierda · acelerador / giro" x={s.rud} y={s.thr} trail={trailOf('rud', 'thr')} />
        <StickPad label="Derecha · avance / lateral" x={s.ail} y={s.ele} trail={trailOf('ail', 'ele')} />
      </div>
      <p className="text-[10px] text-navy-300 mt-1.5">Disposición estándar (Modo 2). Si tu control usa otro modo, las palancas se ven intercambiadas.</p>
    </Card>
  );
}

export function BatteryPanel({ s, has }) {
  if (!has.bat && !has.bv) return null;
  const pct = s.bat ?? 0;
  const color = pct > 30 ? '#34d399' : pct > 15 ? '#fbbf24' : '#f87171';
  return (
    <Card title="Batería" icon="battery_full">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="h-3 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} /></div>
          <p className="text-lg font-black tabular-nums mt-1" style={{ color }}>{f1(s.bat, 0)}%</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {has.bv && <Stat label="Voltaje" value={f1(s.bv, 2)} unit="V" />}
          {has.bt && <Stat label="Temp." value={f1(s.bt, 0)} unit="°C" tone={s.bt >= 50 ? 'text-red-300' : 'text-white'} />}
          {has.bc && <Stat label="Corriente" value={f1(s.bc)} unit="A" />}
        </div>
      </div>
    </Card>
  );
}

export function WeatherPanel({ weather, t, dateLabel }) {
  const w = weather.status === 'ready' ? weather.at(t) : null;
  return (
    <Card title={`Clima del día${dateLabel ? ` · ${dateLabel}` : ''}`} icon="partly_cloudy_day">
      {weather.status === 'loading' && <p className="text-xs text-navy-300">Consultando el clima de la fecha y el lugar del vuelo…</p>}
      {weather.status === 'error' && <p className="text-xs text-navy-300">No se pudo consultar el clima de este vuelo (sin conexión o sin datos para esa fecha).</p>}
      {weather.status === 'ready' && !w && <p className="text-xs text-navy-300">Sin dato de clima para esta hora.</p>}
      {w && (
        <>
          <p className="text-sm font-black text-white mb-1.5">{weatherCodeText(w.code)} <span className="text-xs font-bold text-navy-300">· {w.time.slice(11)} h</span></p>
          <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
            <Stat label="Temperatura" value={f1(w.temp)} unit="°C" />
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wide text-navy-300">Viento</p>
              <p className="text-base font-black tabular-nums leading-tight text-white flex items-center gap-1">
                {f1(w.wind)}<span className="text-[10px] font-bold text-navy-300">m/s</span>
                {w.windDir != null && <span className="material-symbols-outlined text-base text-sky-300" style={{ transform: `rotate(${w.windDir + 180}deg)` }} title={`Del ${Math.round(w.windDir)}°`}>navigation</span>}
              </p>
            </div>
            <Stat label="Ráfagas" value={f1(w.gust)} unit="m/s" tone={w.gust >= 10 ? 'text-red-300' : w.gust >= 7 ? 'text-amber-300' : 'text-white'} />
            <Stat label="Humedad" value={f1(w.humidity, 0)} unit="%" />
            <Stat label="Nubosidad" value={f1(w.cloud, 0)} unit="%" />
            <Stat label="Lluvia" value={f1(w.rain)} unit="mm" tone={w.rain > 0 ? 'text-sky-300' : 'text-white'} />
            <Stat label="Presión" value={f1(w.pressure, 0)} unit="hPa" />
            {w.visibility != null && <Stat label="Visibilidad" value={f1(w.visibility / 1000)} unit="km" />}
          </div>
          <p className="text-[10px] text-navy-300 mt-1.5">Valores estimados por modelo meteorológico (Open-Meteo) para el lugar y la hora del vuelo; no son una medición en el sitio.</p>
        </>
      )}
    </Card>
  );
}

const SEV = [
  { dot: 'bg-sky-400', text: 'text-sky-200', label: 'Info' },
  { dot: 'bg-amber-400', text: 'text-amber-200', label: 'Aviso' },
  { dot: 'bg-red-500', text: 'text-red-200', label: 'Alerta' },
];

export function EventsPanel({ events, t, onSeek, filter, setFilter }) {
  const shown = events.filter((e) => (filter === 'alertas' ? e.s >= 1 : true));
  return (
    <Card title={`Alertas y eventos (${events.length})`} icon="warning">
      <div className="flex gap-1 mb-2">
        {[['todos', 'Todos'], ['alertas', 'Solo avisos y alertas']].map(([k, label]) => (
          <button key={k} type="button" onClick={() => setFilter(k)} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${filter === k ? 'bg-primary text-white' : 'bg-white/10 text-navy-200'}`}>{label}</button>
        ))}
      </div>
      {shown.length === 0 && <p className="text-xs text-navy-300">{events.length === 0 ? 'Este replay no trae eventos (se importó con una versión anterior o el log no los registró).' : 'Sin avisos ni alertas en este vuelo.'}</p>}
      <ul className="space-y-0.5 max-h-56 overflow-y-auto pr-1">
        {shown.map((e, i) => {
          const sev = SEV[e.s] || SEV[0];
          const active = t >= e.t && t < e.t + 4;
          return (
            <li key={`${e.t}-${e.k}-${i}`}>
              <button type="button" onClick={() => onSeek(Math.max(0, e.t - 1))} className={`w-full flex items-start gap-2 text-left rounded-lg px-2 py-1 hover:bg-white/10 ${active ? 'bg-white/15' : ''} ${t < e.t ? 'opacity-60' : ''}`}>
                <span className={`mt-1 size-2 rounded-full shrink-0 ${sev.dot}`} />
                <span className="text-[11px] tabular-nums text-navy-300 w-9 shrink-0">{fmtClock(e.t)}</span>
                <span className={`text-xs ${sev.text}`}>{describeEvent(e)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function SummaryChips({ summary }) {
  if (!summary) return null;
  const chip = (icon, text) => (
    <span key={text} className="inline-flex items-center gap-1 text-[11px] font-bold text-navy-100 bg-white/10 rounded-full px-2.5 py-1 whitespace-nowrap">
      <span className="material-symbols-outlined text-sm text-primary-300">{icon}</span>{text}
    </span>
  );
  return (
    <div className="flex flex-wrap gap-1.5">
      {chip('timer', fmtClock(summary.durationS))}
      {chip('route', `${summary.distanceM >= 1000 ? `${(summary.distanceM / 1000).toFixed(2)} km` : `${summary.distanceM} m`} recorridos`)}
      {summary.maxAlt != null && chip('height', `${f1(summary.maxAlt)} m altura máx.`)}
      {summary.maxSpeed != null && chip('speed', `${f1(summary.maxSpeed)} m/s vel. máx.`)}
      {summary.maxDistHome != null && chip('home_pin', `${f1(summary.maxDistHome, 0)} m máx. de casa`)}
      {summary.satsMin != null && chip('satellite_alt', `${summary.satsMin}–${summary.satsMax} satélites`)}
      {summary.batStart != null && chip('battery_full', `${summary.batStart}% → ${summary.batEnd}%`)}
    </div>
  );
}
