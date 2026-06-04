'use client';
/**
 * /dashboard/dev/flight-replay
 *
 * El archivo .txt DJI se parsea COMPLETAMENTE en el navegador con dji-log-parser-js (WASM).
 * Solo la llamada de keychains a DJI se enruta por nuestro proxy (/api/dev/dji-keychains-proxy)
 * para agregar el Api-Key del servidor — el archivo NUNCA se sube.
 */
import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

const FlightMap = dynamic(() => import('@/components/dev/FlightMap'), { ssr: false });

const COLOR_MODES = [
  { key: 'solid',    label: 'Trayectoria', icon: 'route' },
  { key: 'altitude', label: 'Altitud',     icon: 'landscape' },
];

const MAX_MAP_POINTS = 2000;

export default function FlightReplayPage() {
  const [state, setState]     = useState('idle');  // idle | loading | done | error
  const [flightData, setFlight] = useState(null);
  const [error, setError]     = useState(null);
  const [colorMode, setColor] = useState('solid');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [progress, setProgress] = useState(null);
  const inputRef = useRef(null);

  // ── Parseo en el navegador ──────────────────────────────────────
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

    try {
      // 1. Leer como ArrayBuffer (todo local, sin subir)
      setProgress('Leyendo archivo localmente...');
      const arrayBuf = await file.arrayBuffer();
      const uint8    = new Uint8Array(arrayBuf);

      // 2. Importar la librería WASM dinámicamente
      setProgress('Cargando parser DJI...');
      const { DJILog } = await import('dji-log-parser-js');
      const parser = new DJILog(uint8);

      if (parser.version === 0) {
        setError('El archivo no es un log DJI válido o el formato no está soportado.');
        setState('error');
        return;
      }

      // 3. Intentar parsear sin keychains (logs v1-v12, no cifrados)
      setProgress(`Versión de log detectada: v${parser.version}. Extrayendo frames...`);
      let frames = [];

      if (parser.version < 13) {
        // Formato antiguo — no necesita keychains
        try { frames = parser.frames() ?? []; } catch { frames = []; }
      } else {
        // Versión 13+ — necesita keychains de DJI API
        setProgress('Log cifrado (v13+). Obteniendo keychains de DJI...');

        // fetchKeychains con nuestro proxy como endpoint
        // El proxy agrega el Api-Key real sin exponerlo al browser
        try {
          const keychains = await parser.fetchKeychains(
            'proxy',   // dummy — el proxy ignora este valor y usa DJI_API_KEY del servidor
            '/api/dev/dji-keychains-proxy'
          );
          setProgress('Keychains obtenidas. Descifrando frames...');
          frames = parser.frames(keychains) ?? [];
        } catch (keychainErr) {
          // Si falla el proxy, intentar sin keychains como fallback (tendrá datos limitados)
          console.warn('[flight-replay] keychains falló:', keychainErr.message);
          try { frames = parser.frames() ?? []; } catch { frames = []; }

          if (frames.length === 0) {
            setError(
              `No se pudieron obtener los keychains para descifrar este log (v${parser.version}).\n\n` +
              'Verifica que DJI_API_KEY esté configurada en las variables de entorno de Vercel y ' +
              'que la app de DJI Developer esté activa.'
            );
            setState('error');
            return;
          }
        }
      }

      if (frames.length === 0) {
        setError('El archivo no contiene frames de vuelo. Verifica que el dron tuviera GPS activo.');
        setState('error');
        return;
      }

      // 4. Extraer traza GPS
      setProgress('Extrayendo coordenadas GPS...');
      const gpsFrames = frames.filter(f =>
        f.osd?.latitude  && Math.abs(f.osd.latitude)  <= 90  && f.osd.latitude  !== 0 &&
        f.osd?.longitude && Math.abs(f.osd.longitude) <= 180 && f.osd.longitude !== 0
      );

      if (gpsFrames.length === 0) {
        setError('El log no contiene datos GPS. El dron puede haber volado sin señal satelital.');
        setState('error');
        return;
      }

      // Muestreo proporcional si hay demasiados puntos
      const step = gpsFrames.length > MAX_MAP_POINTS
        ? Math.floor(gpsFrames.length / MAX_MAP_POINTS)
        : 1;

      const path = [];
      for (let i = 0; i < gpsFrames.length; i += step) {
        const f = gpsFrames[i];
        path.push({
          lat:    f.osd.latitude,
          lng:    f.osd.longitude,
          alt:    f.osd.height     ?? f.osd.altitude  ?? 0,
          speed:  f.osd.speed      ?? f.osd.hSpeed    ?? 0,
          bat:    f.battery?.chargeLevel ?? null,
          satNum: f.osd.gpsNum     ?? null,
          t:      f.custom?.dateTime ?? null,
        });
      }

      // 5. Calcular metadatos
      setProgress('Calculando estadísticas...');
      const altVals   = gpsFrames.map(f => f.osd?.height ?? 0).filter(Boolean);
      const speedVals = gpsFrames.map(f => f.osd?.speed ?? f.osd?.hSpeed ?? 0).filter(Boolean);

      let details = {};
      try { details = parser.details ?? {}; } catch {}

      let records = [];
      try { records = parser.records(parser.version >= 13 ? undefined : undefined) ?? []; } catch {}
      const recoverRec = records.find(r => r.type === 'Recover')?.content ?? {};

      const meta = {
        version:      parser.version,
        totalFrames:  frames.length,
        gpsFrames:    gpsFrames.length,
        pathPoints:   path.length,
        samplingStep: step,
        serial:       details.aircraftSn ?? recoverRec.aircraftSn ?? null,
        model:        details.subType    ?? details.productType   ?? null,
        startTime:    details.startTime  ?? null,
        durationS:    details.totalTime  ?? null,
        altMax:       altVals.length   ? Math.max(...altVals)                    : null,
        altAvg:       altVals.length   ? altVals.reduce((a,b)=>a+b,0)/altVals.length : null,
        speedMax:     speedVals.length ? Math.max(...speedVals)                  : null,
        speedAvg:     speedVals.length ? speedVals.reduce((a,b)=>a+b,0)/speedVals.length : null,
        distanceM:    calcDistance(gpsFrames),
        batStart:     gpsFrames[0]?.battery?.chargeLevel                         ?? null,
        batEnd:       gpsFrames[gpsFrames.length-1]?.battery?.chargeLevel        ?? null,
      };

      setFlight({ path, meta });
      setState('done');

    } catch (err) {
      console.error('[flight-replay]', err);
      setError('Error inesperado procesando el archivo: ' + err.message);
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

  const reset = () => {
    setState('idle');
    setFlight(null);
    setError(null);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  // ── Helpers ──────────────────────────────────────────────────────
  const fmtDist = (m) => m >= 1000 ? `${(m/1000).toFixed(2)} km` : `${m} m`;
  const fmtTime = (s) => {
    if (!s) return '---';
    const m = Math.floor(s/60), sec = Math.round(s%60);
    return `${m}:${String(sec).padStart(2,'0')} min`;
  };
  const pct = (v) => v != null ? `${v}%` : '---';

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col animate-in fade-in duration-500">

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-orange-500 text-base">route</span>
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tight text-slate-900">Replay de Vuelo</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Traza GPS DJI .txt · Procesado en el navegador
              <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-black">DEV</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {state === 'done' && (
            <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
              {COLOR_MODES.map(m => (
                <button key={m.key} onClick={() => setColor(m.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    colorMode === m.key ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  <span className="material-symbols-outlined text-sm">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          )}
          {state !== 'idle' && (
            <button onClick={reset}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-slate-500 hover:text-orange-600 border border-slate-200 rounded-xl transition-colors">
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              Nuevo
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Panel izquierdo */}
        <aside className="w-72 shrink-0 flex flex-col border-r border-slate-200 bg-slate-50 overflow-y-auto">

          {/* IDLE / ERROR */}
          {(state === 'idle' || state === 'error') && (
            <div className="flex-1 flex flex-col items-center justify-center p-5 gap-4">

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`w-full flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                  dragging
                    ? 'border-orange-400 bg-orange-50 scale-[1.02]'
                    : 'border-slate-300 hover:border-orange-300 hover:bg-orange-50/50'
                }`}>
                <span className="material-symbols-outlined text-4xl text-slate-300">
                  {dragging ? 'file_open' : 'upload_file'}
                </span>
                <div className="text-center">
                  <p className="text-sm font-black text-slate-700">
                    {dragging ? 'Suelta aquí' : 'Sube el log DJI'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Arrastra o haz clic</p>
                  <p className="text-[10px] text-slate-300 mt-1 font-mono">.txt · procesado localmente</p>
                </div>
                <input ref={inputRef} type="file" accept=".txt"
                  onChange={e => processFile(e.target.files?.[0])} className="hidden" />
              </div>

              {/* Info: sin upload */}
              <div className="w-full bg-green-50 border border-green-200 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-green-600 text-sm shrink-0 mt-0.5">lock</span>
                  <p className="text-[10px] text-green-700 leading-relaxed">
                    El archivo <strong>nunca sale de tu dispositivo</strong>. Se procesa directamente en el navegador con WASM.
                  </p>
                </div>
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
              <div className="w-full space-y-1.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">¿Cómo obtener el archivo?</p>
                {[
                  { icon: 'folder', text: 'DJI RC 2: Almac. interno → DJI → FlightRecord' },
                  { icon: 'phone_android', text: 'Android: DJI Fly → files → FlightRecord' },
                  { icon: 'phone_iphone', text: 'iPhone: iTunes → Archivos → DJI Fly' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-xs text-slate-400 mt-0.5">{item.icon}</span>
                    <p className="text-[10px] text-slate-500">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LOADING */}
          {state === 'loading' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-xs font-black text-slate-700 mb-1">{fileName}</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">{progress}</p>
              </div>
            </div>
          )}

          {/* DONE: estadísticas */}
          {state === 'done' && flightData && (
            <div className="p-4 space-y-3">

              {/* Archivo ok */}
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                <span className="material-symbols-outlined text-green-600 text-base">check_circle</span>
                <div className="min-w-0">
                  <p className="text-xs font-black text-green-700 truncate">{fileName}</p>
                  <p className="text-[10px] text-green-600">
                    {flightData.meta.gpsFrames.toLocaleString()} frames GPS · {flightData.meta.pathPoints} puntos en mapa
                  </p>
                </div>
              </div>

              {/* Aeronave */}
              {(flightData.meta.serial || flightData.meta.model) && (
                <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-0.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Aeronave</p>
                  {flightData.meta.model  && <p className="text-xs font-bold text-slate-800">{flightData.meta.model}</p>}
                  {flightData.meta.serial && <p className="text-[10px] font-mono text-slate-500">{flightData.meta.serial}</p>}
                  {flightData.meta.startTime && (
                    <p className="text-[10px] text-slate-400">
                      {new Date(flightData.meta.startTime).toLocaleString('es-CO')}
                    </p>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: 'timer',      label: 'Duración',   value: fmtTime(flightData.meta.durationS) },
                  { icon: 'straighten', label: 'Distancia',  value: flightData.meta.distanceM ? fmtDist(flightData.meta.distanceM) : '---' },
                  { icon: 'landscape',  label: 'Alt. máx',   value: flightData.meta.altMax ? `${flightData.meta.altMax.toFixed(0)} m` : '---' },
                  { icon: 'speed',      label: 'Vel. máx',   value: flightData.meta.speedMax ? `${flightData.meta.speedMax.toFixed(1)} m/s` : '---' },
                  { icon: 'speed',      label: 'Vel. media', value: flightData.meta.speedAvg ? `${flightData.meta.speedAvg.toFixed(1)} m/s` : '---' },
                  { icon: 'bolt',       label: 'Batería',    value: `${pct(flightData.meta.batStart)} → ${pct(flightData.meta.batEnd)}` },
                ].map((s,i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="material-symbols-outlined text-xs text-slate-400">{s.icon}</span>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{s.label}</p>
                    </div>
                    <p className="text-sm font-black text-slate-800">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Técnico */}
              <details className="bg-slate-100 rounded-xl">
                <summary className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none">
                  Técnico
                </summary>
                <div className="px-3 pb-3 space-y-1 mt-1">
                  {[
                    ['Versión log', `v${flightData.meta.version}`],
                    ['Frames totales', flightData.meta.totalFrames.toLocaleString()],
                    ['Frames GPS', flightData.meta.gpsFrames.toLocaleString()],
                    ['Puntos en mapa', flightData.meta.pathPoints],
                    ['Sampling', `1 de cada ${flightData.meta.samplingStep}`],
                  ].map(([k,v]) => (
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

        {/* Mapa */}
        <main className="flex-1 relative bg-slate-900">
          {state === 'done' && flightData ? (
            <FlightMap path={flightData.path} meta={flightData.meta} colorMode={colorMode} />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-600">
              <span className="material-symbols-outlined text-6xl opacity-20">map</span>
              <p className="text-sm font-black uppercase tracking-widest opacity-30">
                {state === 'loading' ? 'Procesando...' : 'Sube un log .txt para ver la traza'}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Distancia total (haversine) — client-side ─────────────────────
function calcDistance(frames) {
  let total = 0;
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i-1].osd;
    const b = frames[i].osd;
    if (!a?.latitude || !b?.latitude) continue;
    total += haversineM(a.latitude, a.longitude, b.latitude, b.longitude);
  }
  return Math.round(total);
}

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
