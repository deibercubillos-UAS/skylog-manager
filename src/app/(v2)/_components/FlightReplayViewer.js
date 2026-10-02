'use client';

// Skylog V2.0 — Replay GPS (Operación/Bitácora), complemento del sitemap
// (36-sitemap.md §1) que todavía no existía en V2. MVP deliberado, no un
// puerto 1:1 de v1 (components/FlightReplayModal.js, con joysticks/batería
// detallada/detección de alertas): aquí la traza ya viene decimada y lista
// desde `flights.replay_track` (ver api/flights/import-dji + migración
// 20261001000000) — solo play/pausa/velocidad/scrubber + métricas básicas
// sobre el mapa animado. Reutiliza components/dev/FlightAnimMap tal cual
// (componente genérico, sin acoplamiento a tablas de v1: solo recibe
// path/telemetry/onReady) en vez de reescribir la lógica de Leaflet.
import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@skylog/ui';

const FlightAnimMap = dynamic(() => import('@/components/dev/FlightAnimMap'), { ssr: false });

const SPEEDS = [1, 2, 5, 10];

function bsearch(arr, t) {
  let lo = 0;
  let hi = arr.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function fmtTime(s) {
  if (s == null || Number.isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function FlightReplayViewer({ flightId, flightLabel, onClose }) {
  const [state, setState] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);
  const [track, setTrack] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentT, setCurrentT] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(null);

  const mapApiRef = useRef(null);
  const rafRef = useRef(null);
  const lastTickRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/flights/${flightId}/replay`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar el replay');
        if (cancelled) return;
        setTrack(data.track);
        setCurrentFrame({ ...data.track[0], hasGps: true });
        setState('ready');
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setState('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [flightId]);

  const duration = track.length ? track[track.length - 1].t - track[0].t : 0;
  const t0 = track.length ? track[0].t : 0;

  const seekTo = useCallback(
    (relativeT) => {
      if (!track.length) return;
      const clamped = Math.max(0, Math.min(duration, relativeT));
      setCurrentT(clamped);
      const idx = bsearch(track, t0 + clamped);
      const frame = { ...track[idx], hasGps: true };
      setCurrentFrame(frame);
      mapApiRef.current?.updateDrone(frame);
      mapApiRef.current?.updatePlayedPath(idx);
    },
    [track, duration, t0]
  );

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTickRef.current = null;
      return;
    }
    const tick = (now) => {
      if (lastTickRef.current == null) lastTickRef.current = now;
      const deltaS = ((now - lastTickRef.current) / 1000) * speed;
      lastTickRef.current = now;
      setCurrentT((prev) => {
        const next = prev + deltaS;
        if (next >= duration) {
          setPlaying(false);
          return duration;
        }
        seekTo(next);
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, duration]);

  const mapPath = track.map((p) => ({ lat: p.lat, lng: p.lng, t: p.t }));
  const mapTelemetry = track.map((p) => ({ ...p, hasGps: true }));

  return (
    <div className="fixed inset-0 z-[400] bg-navy/90 flex items-center justify-center p-3 md:p-6">
      <div className="bg-[#0f1420] rounded-2xl w-full h-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary-300">Replay GPS</p>
            <p className="text-sm font-bold text-white">{flightLabel || 'Vuelo'}</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/60 hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {state === 'loading' && <div className="flex-1 flex items-center justify-center text-white/60 text-sm">Cargando traza…</div>}
        {state === 'error' && <div className="flex-1 flex items-center justify-center text-red-300 text-sm px-6 text-center">{error}</div>}

        {state === 'ready' && (
          <>
            <div className="flex-1 relative min-h-0">
              <FlightAnimMap path={mapPath} telemetry={mapTelemetry} onReady={(api) => (mapApiRef.current = api)} />

              <div className="absolute top-3 right-3 grid grid-cols-2 gap-2 z-[1]">
                <Metric label="Altitud" value={currentFrame?.alt != null ? `${currentFrame.alt} m` : '—'} />
                <Metric label="Velocidad" value={currentFrame?.speed != null ? `${currentFrame.speed} m/s` : '—'} />
                <Metric label="Batería" value={currentFrame?.battery != null ? `${currentFrame.battery}%` : '—'} />
                <Metric label="Tiempo" value={fmtTime(currentT)} />
              </div>
            </div>

            <div className="px-4 py-3 border-t border-white/10 shrink-0 space-y-2">
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={currentT}
                onChange={(e) => {
                  setPlaying(false);
                  seekTo(Number(e.target.value));
                }}
                className="w-full accent-primary"
              />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button variant="primary" className="w-9 h-9 p-0 flex items-center justify-center rounded-full" onClick={() => setPlaying((p) => !p)}>
                    <span className="material-symbols-outlined text-lg">{playing ? 'pause' : 'play_arrow'}</span>
                  </Button>
                  <span className="text-xs text-white/60 tabular-nums">
                    {fmtTime(currentT)} / {fmtTime(duration)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpeed(s)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${speed === s ? 'bg-primary text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="bg-navy/80 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-1.5 text-right">
      <p className="text-[9px] font-bold uppercase tracking-wide text-navy-300">{label}</p>
      <p className="text-sm font-black text-white tabular-nums">{value}</p>
    </div>
  );
}
