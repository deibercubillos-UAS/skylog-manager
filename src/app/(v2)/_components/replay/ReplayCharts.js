'use client';

// Gráficas del vuelo en el tiempo (altura, velocidad, batería, satélites, señal del control, distancia a casa) con la línea de
// reproducción y las alertas marcadas. Se toca o arrastra sobre una gráfica para saltar a ese instante.
import { useMemo, useRef, useState } from 'react';
import { fmtClock } from './ReplayPanels';

const SERIES = [
  { key: 'alt', label: 'Altura', unit: 'm', color: '#38bdf8' },
  { key: 'spd', label: 'Velocidad', unit: 'm/s', color: '#a78bfa' },
  { key: 'bat', label: 'Batería', unit: '%', color: '#34d399', fixed: [0, 100] },
  { key: 'sat', label: 'Satélites', unit: '', color: '#fbbf24' },
  { key: 'ds', label: 'Señal del control', unit: '%', color: '#fb7185', fixed: [0, 100] },
  { key: 'dh', label: 'Distancia a casa', unit: 'm', color: '#2dd4bf' },
];
const SEV_COLOR = ['#38bdf8', '#f59e0b', '#ef4444'];
const W = 600;
const H = 56;

function Chart({ def, points, events, duration, t, onSeek }) {
  const ref = useRef(null);
  const { path, lo, hi } = useMemo(() => {
    const vals = points.map((p) => p[def.key]);
    const nums = vals.filter((v) => v != null);
    const lo0 = def.fixed ? def.fixed[0] : Math.min(...nums, 0);
    const hi0 = def.fixed ? def.fixed[1] : Math.max(...nums, lo0 + 1);
    const span = hi0 - lo0 || 1;
    let d = '';
    points.forEach((p, i) => {
      const v = p[def.key];
      if (v == null) return;
      const x = (p.t / (duration || 1)) * W;
      const y = H - 4 - ((v - lo0) / span) * (H - 8);
      d += `${d && points[i - 1]?.[def.key] != null ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return { path: d, lo: lo0, hi: hi0 };
  }, [points, def, duration]);

  const seekFrom = (e) => {
    const r = ref.current.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * duration);
  };
  const cur = points.length ? (() => { let best = points[0]; for (const p of points) { if (p.t <= t) best = p; else break; } return best[def.key]; })() : null;
  const x = (t / (duration || 1)) * W;
  return (
    <div className="flex items-stretch gap-2">
      <div className="w-24 shrink-0 pt-1">
        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: def.color }}>{def.label}</p>
        <p className="text-sm font-black tabular-nums text-white">{cur == null ? '—' : Number(cur).toFixed(def.key === 'sat' || def.unit === '%' ? 0 : 1)}<span className="text-[10px] text-navy-300 ml-0.5">{def.unit}</span></p>
        <p className="text-[9px] text-navy-300 tabular-nums">{lo.toFixed(0)}–{hi.toFixed(0)}</p>
      </div>
      <div
        ref={ref}
        className="relative flex-1 h-14 rounded-lg bg-black/25 cursor-crosshair touch-none"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); seekFrom(e); }}
        onPointerMove={(e) => { if (e.buttons) seekFrom(e); }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <path d={path} fill="none" stroke={def.color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
          {events.filter((e) => e.s >= 1).map((e, i) => <line key={i} x1={(e.t / (duration || 1)) * W} x2={(e.t / (duration || 1)) * W} y1="0" y2="8" stroke={SEV_COLOR[e.s]} strokeWidth="2" vectorEffect="non-scaling-stroke" />)}
          <line x1={x} x2={x} y1="0" y2={H} stroke="#fff" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  );
}

export default function ReplayCharts({ points, events, has, t, onSeek }) {
  const available = SERIES.filter((s) => has[s.key]);
  const [on, setOn] = useState(() => new Set(['alt', 'spd', 'bat']));
  const duration = points.length ? points[points.length - 1].t : 0;
  if (!available.length || duration <= 0) return null;
  return (
    <div className="px-3 pb-2 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1">
        {available.map((s) => (
          <button key={s.key} type="button" onClick={() => setOn((prev) => { const n = new Set(prev); if (n.has(s.key)) n.delete(s.key); else n.add(s.key); return n; })}
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${on.has(s.key) ? 'text-white' : 'text-navy-300 border-white/10'}`} style={on.has(s.key) ? { background: `${s.color}33`, borderColor: s.color } : undefined}>
            {s.label}
          </button>
        ))}
        <span className="text-[10px] text-navy-300 ml-auto tabular-nums">{fmtClock(t)} / {fmtClock(duration)}</span>
      </div>
      {available.filter((s) => on.has(s.key)).map((def) => <Chart key={def.key} def={def} points={points} events={events} duration={duration} t={t} onSeek={onSeek} />)}
    </div>
  );
}
