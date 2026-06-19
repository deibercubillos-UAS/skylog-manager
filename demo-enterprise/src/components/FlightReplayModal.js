'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { genPath } from '@/lib/genPath';
import { fmtDuration } from '@/lib/format';
import Icon from '@/components/Icon';

// Visor de replay GPS (SVG animado). Reutilizable desde la cuenta de la organización.
const VB_W = 440, VB_H = 300, PAD = 24;

export default function FlightReplayModal({ flight, missionName, onClose }) {
  const path = useMemo(() => genPath(flight), [flight]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timer = useRef(null);

  // Coordenadas SVG
  const toX = (x) => PAD + x * (VB_W - PAD * 2);
  const toY = (y) => PAD + (1 - y) * (VB_H - PAD * 2);
  const full = path.map((p) => `${toX(p.x).toFixed(1)},${toY(p.y).toFixed(1)}`).join(' ');
  const trav = path.slice(0, idx + 1).map((p) => `${toX(p.x).toFixed(1)},${toY(p.y).toFixed(1)}`).join(' ');
  const cur = path[idx] || path[0];

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setIdx((i) => {
        if (i >= path.length - 1) { setPlaying(false); return i; }
        return i + 1;
      });
    }, 90);
    return () => clearInterval(timer.current);
  }, [playing, path.length]);

  const restart = () => { setIdx(0); setPlaying(true); };
  const progress = Math.round((idx / (path.length - 1)) * 100);
  // tiempo simulado proporcional a la duración del vuelo
  const elapsedMin = ((idx / (path.length - 1)) * (flight?.durationMin || 0));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Icon name="my_location" className="text-lg" style={{ color: 'var(--brand-accent)' }} />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Replay GPS</p>
            <h2 className="text-sm font-black truncate" style={{ color: 'var(--brand-navy)' }}>{missionName || 'Vuelo'}</h2>
          </div>
          <button onClick={onClose} className="ml-auto size-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        {/* Mapa SVG */}
        <div className="bg-slate-900 p-3">
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full rounded-xl" style={{ background: '#0f172a' }}>
            {/* grilla */}
            {[...Array(9)].map((_, i) => (
              <line key={`v${i}`} x1={PAD + (i * (VB_W - PAD * 2)) / 8} y1={PAD} x2={PAD + (i * (VB_W - PAD * 2)) / 8} y2={VB_H - PAD} stroke="#1e293b" strokeWidth="1" />
            ))}
            {[...Array(7)].map((_, i) => (
              <line key={`h${i}`} x1={PAD} y1={PAD + (i * (VB_H - PAD * 2)) / 6} x2={VB_W - PAD} y2={PAD + (i * (VB_H - PAD * 2)) / 6} stroke="#1e293b" strokeWidth="1" />
            ))}
            {/* track completo (tenue) */}
            <polyline points={full} fill="none" stroke="#334155" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {/* track recorrido */}
            <polyline points={trav} fill="none" stroke="var(--brand-accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {/* inicio */}
            <circle cx={toX(path[0].x)} cy={toY(path[0].y)} r="4" fill="#22c55e" />
            {/* dron */}
            {cur && (
              <g transform={`translate(${toX(cur.x)},${toY(cur.y)})`}>
                <circle r="7" fill="var(--brand-accent)" opacity="0.25" />
                <circle r="3.5" fill="#fff" stroke="var(--brand-accent)" strokeWidth="2" />
              </g>
            )}
          </svg>
        </div>

        {/* Lecturas */}
        <div className="grid grid-cols-4 gap-px bg-slate-100">
          <Readout label="Progreso" value={`${progress}%`} />
          <Readout label="Altitud" value={`${cur?.alt ?? 0} m`} />
          <Readout label="Tiempo" value={fmtDuration(elapsedMin)} />
          <Readout label="Punto" value={`${idx + 1}/${path.length}`} />
        </div>

        {/* Controles */}
        <div className="flex items-center gap-3 px-5 py-4">
          <button
            onClick={() => (idx >= path.length - 1 ? restart() : setPlaying((p) => !p))}
            className="size-10 flex items-center justify-center rounded-full text-white shrink-0"
            style={{ backgroundColor: 'var(--brand-accent)' }}
          >
            <Icon name={idx >= path.length - 1 ? 'replay' : playing ? 'pause' : 'play_arrow'} className="text-xl" />
          </button>
          <input
            type="range" min="0" max={path.length - 1} value={idx}
            onChange={(e) => { setPlaying(false); setIdx(Number(e.target.value)); }}
            className="flex-1 accent-[var(--brand-accent)]"
          />
        </div>
        <p className="px-5 pb-4 text-[11px] text-slate-400">
          Trayectoria simulada. En producción se reconstruye del log DJI real (GPS/altitud por segundo).
        </p>
      </div>
    </div>
  );
}

function Readout({ label, value }) {
  return (
    <div className="bg-white py-2.5 text-center">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-sm font-black mt-0.5" style={{ color: 'var(--brand-navy)' }}>{value}</p>
    </div>
  );
}
