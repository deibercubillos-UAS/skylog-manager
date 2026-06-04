'use client';
/**
 * /dashboard/dev/flight-replay
 *
 * Pestaña de desarrollo: visualización de traza de vuelo DJI (.txt) sobre mapa satelital.
 * Sube el archivo → API extrae la traza GPS frame a frame → Leaflet la dibuja.
 */
import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Leaflet solo en cliente
const FlightMap = dynamic(() => import('@/components/dev/FlightMap'), { ssr: false });

const COLOR_MODES = [
  { key: 'solid',    label: 'Trayectoria',  icon: 'route' },
  { key: 'altitude', label: 'Altitud',      icon: 'landscape' },
];

export default function FlightReplayPage() {
  const [state, setState]       = useState('idle'); // idle | loading | done | error
  const [flightData, setFlight] = useState(null);   // { path, meta }
  const [error, setError]       = useState(null);
  const [colorMode, setColor]   = useState('solid');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [progress, setProgress] = useState(null); // texto de estado
  const inputRef = useRef(null);

  // ── Upload & parse ──────────────────────────────────────────────
  const processFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.txt')) {
      setError('Solo se aceptan archivos .txt de log DJI.');
      return;
    }

    setFileName(file.name);
    setState('loading');
    setError(null);
    setFlight(null);
    setProgress('Leyendo archivo...');

    const form = new FormData();
    form.append('file', file);

    try {
      setProgress('Enviando al servidor para parsear...');
      const res = await fetch('/api/dev/parse-flight-path', {
        method: 'POST',
        body: form,
      });

      setProgress('Procesando frames GPS...');
      const data = await res.json();

      if (!res.ok) {
        const hint = data.hint === 'missing_api_key'
          ? '\n\nNota: Para archivos cifrados (DJI Fly / Mini 3 / FPV) necesitas configurar DJI_API_KEY en las variables de entorno de Vercel.'
          : '';
        setError((data.error || 'Error desconocido') + hint);
        setState('error');
        return;
      }

      if (!data.path || data.path.length === 0) {
        setError('El archivo no contiene datos GPS válidos. Verifica que el dron tenga señal GPS registrada.');
        setState('error');
        return;
      }

      setFlight(data);
      setState('done');
    } catch (e) {
      setError('Error de conexión. Intenta de nuevo.');
      setState('error');
    } finally {
      setProgress(null);
    }
  }, []);

  // ── Drag & drop ─────────────────────────────────────────────────
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const onFileChange = (e) => processFile(e.target.files?.[0]);

  const reset = () => {
    setState('idle');
    setFlight(null);
    setError(null);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  // ── Helpers UI ───────────────────────────────────────────────────
  const fmtDist = (m) => m >= 1000 ? `${(m/1000).toFixed(2)} km` : `${m} m`;
  const fmtTime = (s) => {
    if (!s) return '---';
    const m = Math.floor(s / 60), sec = Math.round(s % 60);
    return `${m}:${String(sec).padStart(2,'0')} min`;
  };
  const pct = (v) => v != null ? `${v}%` : '---';

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col gap-0 animate-in fade-in duration-500">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-orange-500 text-base">route</span>
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tight text-slate-900">
              Replay de Vuelo
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Visualización de traza GPS · DJI .txt
              <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-black">DEV</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Color mode toggle — solo si hay datos */}
          {state === 'done' && (
            <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
              {COLOR_MODES.map(m => (
                <button
                  key={m.key}
                  onClick={() => setColor(m.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    colorMode === m.key
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {state !== 'idle' && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-slate-500 hover:text-orange-600 border border-slate-200 rounded-xl transition-colors"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              Nuevo
            </button>
          )}
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Panel izquierdo: upload o stats ─────────────────── */}
        <aside className="w-72 shrink-0 flex flex-col border-r border-slate-200 bg-slate-50 overflow-y-auto">

          {/* IDLE: zona de drop */}
          {(state === 'idle' || state === 'error') && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-5">
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`w-full flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                  dragging
                    ? 'border-orange-400 bg-orange-50 scale-[1.02]'
                    : 'border-slate-300 hover:border-orange-300 hover:bg-orange-50/50'
                }`}
              >
                <span className="material-symbols-outlined text-4xl text-slate-400">
                  {dragging ? 'file_open' : 'upload_file'}
                </span>
                <div className="text-center">
                  <p className="text-sm font-black text-slate-700">
                    {dragging ? 'Suelta aquí' : 'Sube el log DJI'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Arrastra o haz clic</p>
                  <p className="text-[10px] text-slate-300 mt-1 font-mono">.txt · hasta 100 MB</p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".txt"
                  onChange={onFileChange}
                  className="hidden"
                />
              </div>

              {/* Error */}
              {state === 'error' && error && (
                <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-4">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-red-500 text-base shrink-0 mt-0.5">error</span>
                    <p className="text-xs text-red-700 font-medium whitespace-pre-line">{error}</p>
                  </div>
                </div>
              )}

              {/* Instrucciones */}
              <div className="w-full space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">¿Cómo obtener el archivo?</p>
                <div className="space-y-1.5">
                  {[
                    { icon: 'folder', text: 'DJI RC 2: Almac. interno → DJI → FlightRecord' },
                    { icon: 'phone_android', text: 'Android: mismo path desde DJI Fly' },
                    { icon: 'phone_iphone', text: 'iPhone: iTunes → Archivos → DJI Fly' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-xs text-slate-400 mt-0.5">{item.icon}</span>
                      <p className="text-[10px] text-slate-500">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* LOADING */}
          {state === 'loading' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-sm font-black text-slate-700">{fileName}</p>
                <p className="text-xs text-slate-400 mt-1">{progress}</p>
              </div>
            </div>
          )}

          {/* DONE: estadísticas */}
          {state === 'done' && flightData && (
            <div className="p-4 space-y-4">

              {/* Archivo */}
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                <span className="material-symbols-outlined text-green-600 text-base">check_circle</span>
                <div className="min-w-0">
                  <p className="text-xs font-black text-green-700 truncate">{fileName}</p>
                  <p className="text-[10px] text-green-600">
                    {flightData.meta.gpsFrames.toLocaleString()} frames GPS · {flightData.meta.pathPoints} puntos en mapa
                  </p>
                </div>
              </div>

              {/* Info aeronave */}
              {(flightData.meta.serial || flightData.meta.model) && (
                <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aeronave</p>
                  {flightData.meta.model  && <p className="text-xs font-bold text-slate-700">{flightData.meta.model}</p>}
                  {flightData.meta.serial && <p className="text-[10px] font-mono text-slate-500">{flightData.meta.serial}</p>}
                  {flightData.meta.startTime && (
                    <p className="text-[10px] text-slate-400">{new Date(flightData.meta.startTime).toLocaleString('es-CO')}</p>
                  )}
                </div>
              )}

              {/* Estadísticas */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: 'timer', label: 'Duración',  value: fmtTime(flightData.meta.durationS) },
                  { icon: 'straighten', label: 'Distancia', value: flightData.meta.distanceM ? fmtDist(flightData.meta.distanceM) : '---' },
                  { icon: 'landscape', label: 'Alt. máx',  value: flightData.meta.altMax ? `${flightData.meta.altMax.toFixed(0)} m` : '---' },
                  { icon: 'speed',      label: 'Vel. máx',  value: flightData.meta.speedMax ? `${flightData.meta.speedMax.toFixed(1)} m/s` : '---' },
                  { icon: 'speed',      label: 'Vel. media', value: flightData.meta.speedAvg ? `${flightData.meta.speedAvg.toFixed(1)} m/s` : '---' },
                  { icon: 'bolt',       label: 'Batería',    value: `${pct(flightData.meta.batStart)} → ${pct(flightData.meta.batEnd)}` },
                ].map((s, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="material-symbols-outlined text-xs text-slate-400">{s.icon}</span>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                    </div>
                    <p className="text-sm font-black text-slate-800">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Aviso si no hay API key */}
              {flightData.meta.missingApiKey && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-amber-500 text-sm shrink-0">warning</span>
                    <p className="text-[10px] text-amber-700">
                      Sin <code className="font-mono">DJI_API_KEY</code>: solo logs no cifrados (versiones antiguas). Para DJI Fly / Mini 3 / FPV configura la key en Vercel.
                    </p>
                  </div>
                </div>
              )}

              {/* Técnico */}
              <details className="bg-slate-100 rounded-xl">
                <summary className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none">
                  Técnico
                </summary>
                <div className="px-3 pb-3 space-y-1">
                  {[
                    ['Versión parser', `v${flightData.meta.version}`],
                    ['Frames totales', flightData.meta.totalFrames.toLocaleString()],
                    ['Frames GPS', flightData.meta.gpsFrames.toLocaleString()],
                    ['Puntos en mapa', flightData.meta.pathPoints],
                    ['Sampling', `1 de cada ${flightData.meta.samplingStep}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[10px]">
                      <span className="text-slate-500">{k}</span>
                      <span className="font-mono text-slate-700 font-bold">{v}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </aside>

        {/* ── Mapa ────────────────────────────────────────────────── */}
        <main className="flex-1 relative bg-slate-900">
          {state === 'done' && flightData ? (
            <FlightMap
              path={flightData.path}
              meta={flightData.meta}
              colorMode={colorMode}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-600">
              <span className="material-symbols-outlined text-6xl opacity-20">map</span>
              <p className="text-sm font-black uppercase tracking-widest opacity-30">
                {state === 'loading' ? 'Procesando vuelo...' : 'Sube un log .txt para ver la traza'}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
