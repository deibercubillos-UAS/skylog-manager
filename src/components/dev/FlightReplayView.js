'use client';
/**
 * FlightReplayView — visualizador animado de vuelo DJI (.txt)
 * - Drone animado sobre mapa (rotación por yaw)
 * - Joysticks RC en tiempo real
 * - Batería: gráfico + celdas
 * - Timeline con scrubber y marcadores de alerta
 * - Métricas en vivo: altitud, velocidad, modo, satélites
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';

const FlightAnimMap = dynamic(() => import('./FlightAnimMap'), { ssr: false });

// ── Helpers ──────────────────────────────────────────────────────
function bsearch(arr, t) {
  let lo = 0, hi = arr.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].t < t) lo = mid + 1; else hi = mid;
  }
  return lo;
}

function fmtTime(s) {
  if (s == null || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}
function fmtDist(m) { return m >= 1000 ? `${(m/1000).toFixed(2)} km` : `${m} m`; }

const SEVERITY_COLOR = { critical: '#ef4444', warning: '#f59e0b' };
const SEVERITY_BG    = { critical: 'bg-red-900/60 border-red-700', warning: 'bg-amber-900/40 border-amber-700' };
const SEVERITY_TEXT  = { critical: 'text-red-300',  warning: 'text-amber-300' };

const SPEEDS = [1, 2, 5, 10];

// ── Joystick mini ─────────────────────────────────────────────────
function Joystick({ x, y, label, sublabel }) {
  const cx = 50 + (x ?? 0) * 38;
  const cy = 50 - (y ?? 0) * 38;
  const hasData = x != null;
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <svg width="64" height="64" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="46" fill="#1e293b" stroke="#334155" strokeWidth="1.5"/>
        <line x1="50" y1="8"  x2="50" y2="92" stroke="#334155" strokeWidth="0.8"/>
        <line x1="8"  y1="50" x2="92" y2="50" stroke="#334155" strokeWidth="0.8"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#334155" strokeWidth="0.8" strokeDasharray="3 2"/>
        {hasData ? (
          <>
            <line x1="50" y1="50" x2={cx} y2={cy} stroke="#EC5B13" strokeWidth="1.5" opacity="0.5"/>
            <circle cx={cx} cy={cy} r="7" fill="#EC5B13" opacity="0.9"/>
            <circle cx={cx} cy={cy} r="3" fill="white"/>
          </>
        ) : (
          <circle cx="50" cy="50" r="5" fill="#475569"/>
        )}
      </svg>
      <div className="text-center">
        <p className="text-[10px] font-black text-slate-300">{label}</p>
        <p className="text-[9px] text-slate-500">{sublabel}</p>
      </div>
    </div>
  );
}

// ── Battery chart (SVG) ──────────────────────────────────────────
function BatteryChart({ telemetry, alerts, currentTime, totalDuration, onSeek }) {
  const svgRef = useRef(null);
  const W = 800, H = 48;

  const points = useMemo(() => {
    const hasBat = telemetry.some(f => f.bat != null);
    if (!hasBat || totalDuration === 0) return [];
    return telemetry
      .filter(f => f.bat != null)
      .map(f => ({ x: (f.t / totalDuration) * W, y: H - (f.bat / 100) * (H - 4) - 2 }));
  }, [telemetry, totalDuration]);

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const playX    = totalDuration > 0 ? (currentTime / totalDuration) * W : 0;

  const handleClick = (e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    onSeek((e.clientX - rect.left) / rect.width * totalDuration);
  };

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      className="w-full h-full cursor-pointer" onClick={handleClick}>
      <rect width={W} height={H} fill="#0f172a"/>
      {points.length > 0 && (
        <polygon points={`0,${H} ${polyline} ${W},${H}`} fill="#EC5B13" opacity="0.12"/>
      )}
      {points.length > 0 && (
        <polyline points={polyline} fill="none" stroke="#EC5B13" strokeWidth="1.5" opacity="0.8"/>
      )}
      {[25, 50, 75].map(pct => {
        const y = H - (pct / 100) * (H - 4) - 2;
        return (
          <g key={pct}>
            <line x1="0" y1={y} x2={W} y2={y} stroke="#1e293b" strokeWidth="0.8"/>
            <text x="4" y={y - 2} fill="#475569" fontSize="7">{pct}%</text>
          </g>
        );
      })}
      {alerts.map((a, i) => {
        const x = totalDuration > 0 ? (a.t / totalDuration) * W : 0;
        return (
          <g key={i}>
            <line x1={x} y1="0" x2={x} y2={H}
              stroke={SEVERITY_COLOR[a.severity] ?? '#f59e0b'} strokeWidth="1.5" opacity="0.8"/>
            <circle cx={x} cy={H - 5} r="3"
              fill={SEVERITY_COLOR[a.severity] ?? '#f59e0b'} opacity="0.9"/>
          </g>
        );
      })}
      <line x1={playX} y1="0" x2={playX} y2={H} stroke="white" strokeWidth="1.5" opacity="0.9"/>
      <circle cx={playX} cy={H / 2} r="4" fill="white" opacity="0.9"/>
    </svg>
  );
}

// ── Componente principal ─────────────────────────────────────────
export default function FlightReplayView({ flightData, fileName, onReset, onClose, saving, saved }) {
  const { path, telemetry, alerts, meta } = flightData;
  const totalDuration = meta.totalDuration ?? meta.durationS ?? 0;

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed]         = useState(1);
  const [displayTime, setDisplayTime] = useState(0);

  const timeRef       = useRef(0);
  const playRef       = useRef(false);
  const speedRef      = useRef(1);
  const rafRef        = useRef(null);
  const lastTimestamp = useRef(null);
  const mapApiRef     = useRef(null);

  const currentFrame = useMemo(
    () => telemetry[bsearch(telemetry, displayTime)] ?? telemetry[0],
    [telemetry, displayTime]
  );

  // ── Loop de animación ─────────────────────────────────────────
  const animateLoop = useCallback((timestamp) => {
    if (!playRef.current) return;
    const delta = lastTimestamp.current != null
      ? (timestamp - lastTimestamp.current) / 1000 : 0;
    lastTimestamp.current = timestamp;
    timeRef.current = Math.min(timeRef.current + delta * speedRef.current, totalDuration);

    const idx = bsearch(telemetry, timeRef.current);
    const f   = telemetry[idx];
    if (f && mapApiRef.current) {
      mapApiRef.current.updateDrone(f);
      mapApiRef.current.updatePlayedPath(idx);
    }

    if (timeRef.current >= totalDuration) {
      playRef.current = false;
      setIsPlaying(false);
      setDisplayTime(totalDuration);
      lastTimestamp.current = null;
      return;
    }
    rafRef.current = requestAnimationFrame(animateLoop);
  }, [telemetry, totalDuration]);

  // Actualizar React state a ~10fps
  useEffect(() => {
    const interval = setInterval(() => {
      if (playRef.current) setDisplayTime(timeRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const play = useCallback(() => {
    if (timeRef.current >= totalDuration) timeRef.current = 0;
    playRef.current = true;
    lastTimestamp.current = null;
    setIsPlaying(true);
    rafRef.current = requestAnimationFrame(animateLoop);
  }, [animateLoop, totalDuration]);

  const pause = useCallback(() => {
    playRef.current = false;
    lastTimestamp.current = null;
    setIsPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const seek = useCallback((t) => {
    const clamped = Math.max(0, Math.min(t, totalDuration));
    timeRef.current = clamped;
    setDisplayTime(clamped);
    const idx = bsearch(telemetry, clamped);
    const f   = telemetry[idx];
    if (f && mapApiRef.current) {
      mapApiRef.current.updateDrone(f);
      mapApiRef.current.updatePlayedPath(idx);
    }
  }, [telemetry, totalDuration]);

  const changeSpeed = useCallback((s) => { speedRef.current = s; setSpeed(s); }, []);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const f = currentFrame;
  const batColor = f?.bat == null ? 'text-slate-400'
    : f.bat > 40 ? 'text-green-400' : f.bat > 20 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white overflow-hidden">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-orange-500 text-sm">route</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-white truncate max-w-[160px] md:max-w-[260px]">{fileName}</p>
            <p className="text-[10px] text-slate-500">
              {meta.model ?? 'DJI'} · {meta.serial ?? '---'} · {fmtTime(totalDuration)}
              {meta.alertCount > 0 && (
                <span className="ml-2 text-red-400 font-bold">{meta.alertCount} alerta{meta.alertCount !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex bg-slate-800 rounded-lg p-0.5 gap-0.5">
            {SPEEDS.map(s => (
              <button key={s} onClick={() => changeSpeed(s)}
                className={`px-2 py-1 rounded text-[10px] font-black transition-all ${
                  speed === s ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
                }`}>{s}x</button>
            ))}
          </div>
          <button onClick={isPlaying ? pause : play}
            className="w-9 h-9 rounded-xl bg-orange-600 hover:bg-orange-500 flex items-center justify-center transition-colors active:scale-95">
            <span className="material-symbols-outlined text-base">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <button onClick={() => { pause(); seek(0); }}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-base text-slate-300">skip_previous</span>
          </button>
          {onReset && (
            <button onClick={onReset}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-black text-slate-400 hover:text-white border border-slate-700 rounded-xl transition-colors">
              <span className="material-symbols-outlined text-sm">upload_file</span>
              Otro archivo
            </button>
          )}
          {/* Badge guardado */}
          {saving && (
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg px-2 py-1">
              <div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              <span className="hidden sm:inline text-[10px] text-slate-400">Guardando</span>
            </div>
          )}
          {saved && !saving && (
            <div className="flex items-center gap-1 bg-green-900/70 rounded-lg px-2 py-1">
              <span className="material-symbols-outlined text-green-400 text-xs">cloud_done</span>
              <span className="hidden sm:inline text-[10px] text-green-400">Guardado</span>
            </div>
          )}
          {/* Botón cerrar — siempre visible */}
          {onClose && (
            <button onClick={onClose}
              aria-label="Cerrar replay"
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none">
              <span className="material-symbols-outlined text-slate-300 text-base">close</span>
            </button>
          )}
        </div>
      </header>

      {/* ── BODY ───────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Panel izquierdo: alertas */}
        <aside className="w-56 shrink-0 flex flex-col border-r border-slate-800 bg-slate-900 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alertas</p>
            <span className={`text-xs font-black px-1.5 py-0.5 rounded ${
              alerts.length > 0 ? 'bg-red-900/60 text-red-300' : 'bg-slate-800 text-slate-500'
            }`}>{alerts.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
                <span className="material-symbols-outlined text-3xl text-green-500">check_circle</span>
                <p className="text-[10px] text-slate-500 text-center">Sin alertas detectadas en este vuelo</p>
              </div>
            ) : alerts.map((a, i) => (
              <button key={i} onClick={() => { pause(); seek(a.t); }}
                className={`w-full text-left p-2 rounded-lg border text-[10px] transition-all hover:opacity-100 ${SEVERITY_BG[a.severity]} opacity-80 hover:scale-[1.02]`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`material-symbols-outlined text-sm ${SEVERITY_TEXT[a.severity]}`}>
                    {a.severity === 'critical' ? 'error' : 'warning'}
                  </span>
                  <span className={`font-black ${SEVERITY_TEXT[a.severity]}`}>{fmtTime(a.t)}</span>
                </div>
                <p className="text-slate-300 leading-snug">{a.label}</p>
              </button>
            ))}
          </div>

          {/* Stats resumen */}
          <div className="p-3 border-t border-slate-800 space-y-1.5">
            {[
              { icon: 'straighten', label: 'Distancia', value: meta.distanceM ? fmtDist(meta.distanceM) : '---' },
              { icon: 'landscape',  label: 'Alt. máx',  value: meta.altMax ? `${meta.altMax.toFixed(0)} m` : '---' },
              { icon: 'speed',      label: 'Vel. máx',  value: meta.speedMax ? `${meta.speedMax.toFixed(1)} m/s` : '---' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-slate-500">{s.icon}</span>
                  <span className="text-[10px] text-slate-500">{s.label}</span>
                </div>
                <span className="text-[10px] font-black text-slate-300">{s.value}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Mapa */}
        <main className="flex-1 relative">
          <FlightAnimMap
            path={path}
            telemetry={telemetry}
            meta={meta}
            onReady={(api) => { mapApiRef.current = api; }}
          />
        </main>

        {/* Panel derecho: telemetría */}
        <aside className="w-52 shrink-0 flex flex-col border-l border-slate-800 bg-slate-900 overflow-hidden">
          <div className="border-b border-slate-800 px-3 py-2 text-center">
            <p className="text-lg font-black text-white font-mono tracking-wider">{fmtTime(displayTime)}</p>
            <p className="text-[10px] text-slate-500">/ {fmtTime(totalDuration)}</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Métricas live */}
            <div className="p-3 space-y-2 border-b border-slate-800">
              {[
                { icon: 'landscape',     label: 'Altitud', value: f?.alt    != null ? `${f.alt.toFixed(1)} m`                                : '---' },
                { icon: 'speed',         label: 'Vel. H',  value: f?.speedH != null ? `${f.speedH.toFixed(1)} m/s`                           : '---' },
                { icon: 'arrow_upward',  label: 'Vel. V',  value: f?.speedV != null ? `${f.speedV > 0 ? '+' : ''}${f.speedV.toFixed(1)} m/s` : '---' },
                { icon: 'satellite_alt', label: 'GPS',     value: f?.gpsNum != null ? `${f.gpsNum} sat`                                       : '---' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-slate-500">{s.icon}</span>
                    <span className="text-[10px] text-slate-500">{s.label}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-200">{s.value}</span>
                </div>
              ))}
              {f?.flightMode && (
                <div className="bg-slate-800 rounded-lg px-2 py-1 text-center">
                  <p className="text-[9px] text-slate-500 uppercase tracking-wide">Modo</p>
                  <p className="text-[10px] font-black text-orange-400">{f.flightMode}</p>
                </div>
              )}
            </div>

            {/* Batería */}
            <div className="p-3 border-b border-slate-800 space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Batería</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${
                    (f?.bat ?? 100) > 40 ? 'bg-green-500' : (f?.bat ?? 100) > 20 ? 'bg-amber-500' : 'bg-red-500'
                  }`} style={{ width: `${f?.bat ?? 0}%` }} />
                </div>
                <span className={`text-sm font-black ${batColor}`}>{f?.bat != null ? `${f.bat}%` : '---'}</span>
              </div>
              {f?.voltage != null && <p className="text-[10px] text-slate-400 font-mono">{f.voltage.toFixed(2)} V</p>}
              {f?.cellVolts?.length > 0 && (
                <div className="space-y-0.5">
                  {f.cellVolts.map((v, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-[9px] text-slate-600 w-4">C{i+1}</span>
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${v > 3.7 ? 'bg-green-500' : v > 3.5 ? 'bg-amber-400' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(((v-3.0)/(4.2-3.0))*100,100)}%` }}/>
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono w-8 text-right">{v.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Joysticks RC */}
            {meta.hasRC ? (
              <div className="p-3 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Control RC</p>
                <div className="flex justify-center gap-2">
                  <Joystick x={f?.rc_rud} y={f?.rc_thr} label="Izq." sublabel="Throt · Rud"/>
                  <Joystick x={f?.rc_ail} y={f?.rc_ele} label="Der." sublabel="Ail · Ele"/>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[9px]">
                  {[['Thr', f?.rc_thr], ['Rud', f?.rc_rud], ['Ail', f?.rc_ail], ['Ele', f?.rc_ele]].map(([k, v]) => (
                    <div key={k} className="flex justify-between bg-slate-800 rounded px-1.5 py-0.5">
                      <span className="text-slate-500">{k}</span>
                      <span className="font-mono text-slate-300">{v != null ? v.toFixed(2) : '---'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 text-center">
                <p className="text-[10px] text-slate-600">RC no registrado en este log</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── BOTTOM: timeline + battery chart ───────────────────── */}
      <div className="shrink-0 bg-slate-900 border-t border-slate-800">
        <div className="px-4 py-1 flex items-center gap-3">
          <span className="text-[10px] font-mono text-slate-500 w-10 text-right shrink-0">
            {fmtTime(displayTime)}
          </span>
          <input
            type="range"
            min={0}
            max={totalDuration}
            step={0.1}
            value={displayTime}
            onChange={e => { pause(); seek(parseFloat(e.target.value)); }}
            className="flex-1 accent-orange-500 cursor-pointer h-1"
          />
          <span className="text-[10px] font-mono text-slate-500 w-10 shrink-0">
            {fmtTime(totalDuration)}
          </span>
        </div>
        <div className="px-4 pb-2 h-12">
          <BatteryChart
            telemetry={telemetry}
            alerts={alerts}
            currentTime={displayTime}
            totalDuration={totalDuration}
            onSeek={t => { pause(); seek(t); }}
          />
        </div>
      </div>
    </div>
  );
}
