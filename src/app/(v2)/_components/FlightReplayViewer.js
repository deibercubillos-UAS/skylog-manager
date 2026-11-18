'use client';

// Skylog V2.0 — Replay del vuelo (Operación/Bitácora). Reproduce el vuelo con TODO lo que trae el log: mapa satelital con la ruta y
// las alertas, instrumentos (horizonte, rumbo, altura, velocidades, distancia a casa, modo de vuelo), satélites GPS y señal del
// control, palancas, batería, clima del día y la hora del vuelo, y la lista de alertas/eventos que salta al instante. Las
// gráficas en el tiempo sirven también para moverse por el vuelo. Los replays guardados con el formato anterior (solo posición,
// altura, velocidad, rumbo y batería) se siguen viendo: los paneles sin datos se ocultan. Datos y reglas: @skylog/domain/flightTelemetry.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { normalizeReplay, summarizeReplay, sampleAt, describeEvent } from '@skylog/domain';
import { useFlightWeather } from './replay/useFlightWeather';
import ReplayCharts from './replay/ReplayCharts';
import { InstrumentsPanel, LocationPanel, GpsLinkPanel, SticksPanel, SticksOverlay, hasSticks, BatteryPanel, WeatherPanel, EventsPanel, SummaryChips, fmtClock } from './replay/ReplayPanels';

const ReplayMap = dynamic(() => import('./replay/ReplayMap'), { ssr: false });
const SPEEDS = [0.5, 1, 2, 5, 10, 20];
const SEV_BANNER = ['bg-sky-500/90', 'bg-amber-500/95', 'bg-red-600/95'];

export default function FlightReplayViewer({ flightId, flightLabel, takeoffAt, onClose }) {
  const [state, setState] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);
  const [replay, setReplay] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [snap, setSnap] = useState({ t: 0 });
  const [layer, setLayer] = useState('satelite');
  const [follow, setFollow] = useState(false);
  const [zoom, setZoom] = useState(null);
  const [coverage, setCoverage] = useState(null); // nivel hasta el que hay imagen satelital real en esta zona (si es menor que 19)
  const [eventFilter, setEventFilter] = useState('todos');
  const [tab, setTab] = useState('datos'); // solo en pantallas angostas
  const [sticksOnMap, setSticksOnMap] = useState(true);

  const mapApiRef = useRef(null);
  const tRef = useRef(0);
  const lastPaintRef = useRef(0);

  const loadReplay = useCallback(async () => {
    try {
      const res = await fetch(`/api/flights/${flightId}/replay`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar el replay');
      const r = normalizeReplay(data.track);
      if (r.points.length < 2) throw new Error('El replay de este vuelo no tiene puntos GPS válidos');
      setReplay(r);
      setState('ready');
    } catch (e) {
      setError(e.message);
      setState('error');
    }
  }, [flightId]);

  useEffect(() => { loadReplay(); }, [loadReplay]);

  // Vuelos guardados con el replay anterior: se actualizan con el log del mismo vuelo (analiza el archivo y reemplaza solo el replay).
  const [updating, setUpdating] = useState(null); // null | 'working' | texto de error
  async function updateReplay(file) {
    if (!file) return;
    setUpdating('working');
    try {
      const form = new FormData();
      form.append('files', file);
      const a = await fetch('/api/flights/import-dji', { method: 'POST', body: form });
      const ad = await a.json().catch(() => ({}));
      const r = ad.results?.[0];
      if (!a.ok || !r || r.error || !r.replayTrack || !r.importToken) throw new Error(r?.error || ad.error || 'No se pudo leer ese log. Revisa que sea el archivo del vuelo.');
      const u = await fetch(`/api/flights/${flightId}/replay`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ replayTrack: r.replayTrack, importToken: r.importToken, takeoffAt: r.takeoffAt, landingAt: r.landingAt, totalTime: r.totalTime, batterySerial: r.batterySerial, batteryCycles: r.batteryCycles }) });
      const ud = await u.json().catch(() => ({}));
      if (!u.ok) throw new Error(ud.error || 'No se pudo actualizar el replay');
      tRef.current = 0;
      setSnap({ t: 0 });
      await loadReplay();
      setUpdating(null);
    } catch (e) {
      setUpdating(e.message);
    }
  }

  const points = replay?.points;
  const duration = points ? points[points.length - 1].t : 0;
  const summary = useMemo(() => (points ? summarizeReplay(points) : null), [points]);
  const weather = useFlightWeather({ lat: replay?.home?.lat ?? points?.[0]?.lat, lng: replay?.home?.lng ?? points?.[0]?.lng, takeoffAt, durationS: duration });

  // Pinta el instante t: el mapa a cada cuadro; el resto de la pantalla ~15 veces por segundo para no recargar al navegador.
  const paint = useCallback((t, force = false) => {
    if (!points) return;
    const s = sampleAt(points, t);
    mapApiRef.current?.update(s);
    mapApiRef.current?.pulse(t);
    const now = performance.now();
    if (force || now - lastPaintRef.current > 66) { lastPaintRef.current = now; setSnap({ t }); }
  }, [points]);

  const seek = useCallback((t) => { tRef.current = Math.max(0, Math.min(duration, t)); paint(tRef.current, true); }, [duration, paint]);

  useEffect(() => {
    if (!playing) return undefined;
    let raf;
    let last = null;
    const tick = (now) => {
      if (last == null) last = now;
      tRef.current += ((now - last) / 1000) * speed;
      last = now;
      if (tRef.current >= duration) { tRef.current = duration; paint(duration, true); setPlaying(false); return; }
      paint(tRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, duration, paint]);

  // Teclado: espacio = reproducir/pausar; flechas = ±5 s.
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); setPlaying((p) => !p); }
      if (e.code === 'ArrowRight') seek(tRef.current + 5);
      if (e.code === 'ArrowLeft') seek(tRef.current - 5);
      if (e.code === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [seek, onClose]);

  const onMapReady = useCallback((api) => { mapApiRef.current = api; api.update(sampleAt(points, tRef.current)); }, [points]);

  const t = snap.t;
  const s = points ? sampleAt(points, t) : null;
  const banner = replay?.events.filter((e) => e.t <= t && t - e.t < 6 && (e.s >= 1 || t - e.t < 3)).slice(-1)[0];

  const panels = replay && s && (
    <>
      <InstrumentsPanel s={s} has={replay.has} modes={replay.modes} ghs={replay.ghs} />
      <LocationPanel s={s} points={points} home={replay.home} />
      <GpsLinkPanel s={s} has={replay.has} />
      <SticksPanel s={s} has={replay.has} points={points} t={t} legacy={replay.legacy} />
      <BatteryPanel s={s} has={replay.has} />
      <WeatherPanel weather={weather} t={t} dateLabel={weather.dateLabel} />
    </>
  );

  return (
    <div className="fixed inset-0 z-[400] bg-navy/90 flex items-center justify-center p-0 sm:p-3" role="dialog" aria-modal="true" aria-label="Replay del vuelo">
      <div className="bg-[#0f1420] sm:rounded-2xl w-full h-full max-w-[1500px] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-start justify-between gap-3 px-4 py-2.5 border-b border-white/10 shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary-300">Replay del vuelo</p>
            <p className="text-sm font-bold text-white truncate">{flightLabel || 'Vuelo'}</p>
            {state === 'ready' && <div className="mt-1.5 hidden sm:block"><SummaryChips summary={summary} /></div>}
            {state === 'ready' && replay.legacy && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-amber-200 bg-amber-500/15 border border-amber-400/30 rounded-lg px-2.5 py-1.5">
                <span>Replay con el formato anterior: sin palancas, satélites ni alertas.</span>
                <label className={`inline-flex items-center gap-1 font-bold text-white bg-primary rounded-full px-2.5 py-1 cursor-pointer ${updating === 'working' ? 'opacity-60 pointer-events-none' : ''}`}>
                  <span className="material-symbols-outlined text-sm">sync</span>
                  {updating === 'working' ? 'Actualizando…' : 'Actualizar replay'}
                  <input type="file" accept=".txt" className="hidden" onChange={(e) => { updateReplay(e.target.files?.[0]); e.target.value = ''; }} />
                </label>
                {updating && updating !== 'working' && <span className="text-red-200 font-semibold">{updating}</span>}
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-white/60 hover:text-white size-9 flex items-center justify-center shrink-0" aria-label="Cerrar"><span className="material-symbols-outlined">close</span></button>
        </div>

        {state === 'loading' && <div className="flex-1 flex items-center justify-center text-white/60 text-sm">Cargando el vuelo…</div>}
        {state === 'error' && <div className="flex-1 flex items-center justify-center text-red-300 text-sm px-6 text-center">{error}</div>}

        {state === 'ready' && (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
            <div className="flex flex-col min-h-0 lg:flex-1 h-[46%] lg:h-auto">
              <div className="relative flex-1 min-h-0">
                <ReplayMap points={points} events={replay.events} home={replay.home} layer={layer} follow={follow} onReady={onMapReady} onZoom={setZoom} onCoverage={setCoverage} />
                {banner && (
                  <div className={`absolute top-3 left-3 right-16 z-[500] rounded-xl px-3 py-2 text-white text-sm font-bold shadow-lg ${SEV_BANNER[banner.s] || SEV_BANNER[0]}`}>
                    <span className="material-symbols-outlined text-base align-middle mr-1">{banner.s >= 1 ? 'warning' : 'info'}</span>
                    {fmtClock(banner.t)} · {describeEvent(banner)}
                  </div>
                )}
                {sticksOnMap && hasSticks(replay.has) && <SticksOverlay s={s} points={points} t={t} />}
                {zoom != null && <span className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[500] text-[10px] font-bold text-white/80 bg-navy/70 rounded px-1.5 py-0.5 tabular-nums" aria-label={`Nivel de zoom ${zoom}`}>Zoom {zoom}{layer === 'satelite' && coverage != null && zoom > coverage ? ` · imagen real hasta ${coverage}` : ''}</span>}
                <div className="absolute top-3 right-3 z-[500] flex flex-col gap-1.5">
                  <button type="button" onClick={() => mapApiRef.current?.zoomIn()} className="size-9 rounded-lg bg-navy/85 text-white border border-white/15 flex items-center justify-center" title="Acercar" aria-label="Acercar"><span className="material-symbols-outlined text-lg">add</span></button>
                  <button type="button" onClick={() => mapApiRef.current?.zoomOut()} className="size-9 rounded-lg bg-navy/85 text-white border border-white/15 flex items-center justify-center" title="Alejar" aria-label="Alejar"><span className="material-symbols-outlined text-lg">remove</span></button>
                  <button type="button" onClick={() => mapApiRef.current?.zoomToDrone(21)} className="size-9 rounded-lg bg-navy/85 text-white border border-white/15 flex items-center justify-center" title="Acercarse al dron" aria-label="Acercarse al dron"><span className="material-symbols-outlined text-lg">zoom_in_map</span></button>
                  <button type="button" onClick={() => setLayer((l) => (l === 'satelite' ? 'calle' : 'satelite'))} className="size-9 rounded-lg bg-navy/85 text-white border border-white/15 flex items-center justify-center" title="Cambiar mapa" aria-label="Cambiar entre satélite y calles"><span className="material-symbols-outlined text-lg">{layer === 'satelite' ? 'map' : 'satellite'}</span></button>
                  <button type="button" onClick={() => setFollow((f) => !f)} className={`size-9 rounded-lg border border-white/15 flex items-center justify-center ${follow ? 'bg-primary text-white' : 'bg-navy/85 text-white'}`} title="Seguir al dron" aria-label="Seguir al dron" aria-pressed={follow}><span className="material-symbols-outlined text-lg">my_location</span></button>
                  {hasSticks(replay.has) && <button type="button" onClick={() => setSticksOnMap((v) => !v)} className={`size-9 rounded-lg border border-white/15 flex items-center justify-center ${sticksOnMap ? 'bg-primary text-white' : 'bg-navy/85 text-white'}`} title="Palancas sobre el mapa" aria-label="Palancas sobre el mapa" aria-pressed={sticksOnMap}><span className="material-symbols-outlined text-lg">gamepad</span></button>}
                  <button type="button" onClick={() => mapApiRef.current?.fit()} className="size-9 rounded-lg bg-navy/85 text-white border border-white/15 flex items-center justify-center" title="Ver toda la ruta" aria-label="Ver toda la ruta"><span className="material-symbols-outlined text-lg">fit_screen</span></button>
                </div>
              </div>
              <div className="shrink-0 border-t border-white/10 max-h-[34vh] overflow-y-auto hidden sm:block">
                <ReplayCharts points={points} events={replay.events} has={replay.has} t={t} onSeek={seek} />
              </div>
              <div className="px-3 py-2 border-t border-white/10 shrink-0 space-y-1.5">
                <div className="relative">
                  <input type="range" min={0} max={duration} step={0.1} value={t} onChange={(e) => { setPlaying(false); seek(Number(e.target.value)); }} className="w-full accent-primary" aria-label="Posición en el vuelo" />
                  {replay.events.filter((e) => e.s >= 1).map((e, i) => <span key={i} className={`absolute top-0 w-0.5 h-2 pointer-events-none ${e.s === 2 ? 'bg-red-500' : 'bg-amber-400'}`} style={{ left: `calc(${(e.t / (duration || 1)) * 100}% )` }} />)}
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => { if (tRef.current >= duration) seek(0); setPlaying((p) => !p); }} className="size-10 rounded-full bg-primary text-white flex items-center justify-center" aria-label={playing ? 'Pausar' : 'Reproducir'}><span className="material-symbols-outlined">{playing ? 'pause' : 'play_arrow'}</span></button>
                    <button type="button" onClick={() => seek(t - 10)} className="size-9 rounded-full bg-white/10 text-white flex items-center justify-center" aria-label="Retroceder 10 segundos"><span className="material-symbols-outlined text-lg">replay_10</span></button>
                    <button type="button" onClick={() => seek(t + 10)} className="size-9 rounded-full bg-white/10 text-white flex items-center justify-center" aria-label="Adelantar 10 segundos"><span className="material-symbols-outlined text-lg">forward_10</span></button>
                    <span className="text-xs text-white/70 tabular-nums ml-1">{fmtClock(t)} / {fmtClock(duration)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {SPEEDS.map((v) => <button key={v} type="button" onClick={() => setSpeed(v)} className={`text-xs font-bold px-2.5 py-1 rounded-full ${speed === v ? 'bg-primary text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>{v}x</button>)}
                  </div>
                </div>
              </div>
            </div>

            {/* Panel de datos: a un lado en pantallas anchas; debajo del mapa en las angostas */}
            <aside className="lg:w-[380px] lg:border-l border-t lg:border-t-0 border-white/10 min-h-0 flex-1 lg:flex-none overflow-y-auto p-3 space-y-3">
              <div className="sm:hidden flex gap-1">
                {[['datos', 'Datos'], ['alertas', 'Alertas'], ['graficas', 'Gráficas']].map(([k, label]) => <button key={k} type="button" onClick={() => setTab(k)} className={`flex-1 text-xs font-bold py-1.5 rounded-lg ${tab === k ? 'bg-primary text-white' : 'bg-white/10 text-navy-200'}`}>{label}</button>)}
              </div>
              <div className={`${tab === 'datos' ? '' : 'max-sm:hidden'} space-y-3`}>
                <div className="sm:hidden"><SummaryChips summary={summary} /></div>
                {panels}
              </div>
              <div className={`${tab === 'alertas' ? '' : 'max-sm:hidden'}`}>
                <EventsPanel events={replay.events} t={t} onSeek={seek} filter={eventFilter} setFilter={setEventFilter} />
              </div>
              <div className={`sm:hidden ${tab === 'graficas' ? '' : 'hidden'}`}>
                <ReplayCharts points={points} events={replay.events} has={replay.has} t={t} onSeek={seek} />
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
