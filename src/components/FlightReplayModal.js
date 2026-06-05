'use client';
/**
 * FlightReplayModal
 * Modal fullscreen que combina:
 *   - Upload / parseo del .txt DJI (browser WASM)
 *   - FlightReplayView con animación, joysticks, batería y alertas
 *
 * Uso:
 *   <FlightReplayModal
 *     open={true}
 *     onClose={() => setOpen(false)}
 *     flightLabel="SKY-001 · 2025-06-01"   // opcional — label del vuelo
 *   />
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { detectAlerts, buildTelemetry } from '@/lib/djiTelemetry';

const FlightReplayView = dynamic(
  () => import('@/components/dev/FlightReplayView'),
  { ssr: false, loading: () => <ModalSpinner text="Cargando visor..." /> }
);

function calcDistance(frames) {
  let total = 0;
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i-1].osd, b = frames[i].osd;
    if (!a?.latitude || !b?.latitude) continue;
    const R = 6371000, dLat = (b.latitude-a.latitude)*Math.PI/180, dLon = (b.longitude-a.longitude)*Math.PI/180;
    const x = Math.sin(dLat/2)**2 + Math.cos(a.latitude*Math.PI/180)*Math.cos(b.latitude*Math.PI/180)*Math.sin(dLon/2)**2;
    total += R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
  }
  return Math.round(total);
}

// ── Gzip helpers (Web Streams API) ───────────────────────────────
async function gzipJson(obj) {
  const json    = JSON.stringify(obj);
  const bytes   = new TextEncoder().encode(json);
  const stream  = new CompressionStream('gzip');
  const writer  = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const chunks  = [];
  const reader  = stream.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total  = chunks.reduce((s, c) => s + c.length, 0);
  const result = new Uint8Array(total);
  let offset   = 0;
  for (const c of chunks) { result.set(c, offset); offset += c.length; }
  return result;
}

async function gunzipJson(arrayBuffer) {
  const stream  = new DecompressionStream('gzip');
  const writer  = stream.writable.getWriter();
  writer.write(new Uint8Array(arrayBuffer));
  writer.close();
  const chunks  = [];
  const reader  = stream.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total  = chunks.reduce((s, c) => s + c.length, 0);
  const result = new Uint8Array(total);
  let offset   = 0;
  for (const c of chunks) { result.set(c, offset); offset += c.length; }
  return JSON.parse(new TextDecoder().decode(result));
}

// ── Componente principal ─────────────────────────────────────────
// Props:
//   open        — boolean, controla visibilidad
//   onClose     — fn() al cerrar
//   flightId    — string | null — id del vuelo en BD (para guardar/cargar)
//   hasReplay   — boolean — si true, carga automáticamente desde Storage
//   flightLabel — string opcional para mostrar en el header
//   onReplaySaved — fn() llamado cuando se guarda exitosamente (para actualizar UI padre)
export default function FlightReplayModal({ open, onClose, flightId, hasReplay, flightLabel, onReplaySaved }) {
  const [state, setState]       = useState('idle');   // idle | loading | done | error
  const [flightData, setFlight] = useState(null);
  const [error, setError]       = useState(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [progress, setProgress] = useState(null);
  const [saveOpt, setSaveOpt]   = useState(true);   // checkbox "guardar replay"
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const inputRef = useRef(null);

  const reset = useCallback(() => {
    setState('idle'); setFlight(null); setError(null);
    setFileName(null); setProgress(null); setSaved(false);
  }, []);

  const handleClose = useCallback(() => { reset(); onClose(); }, [reset, onClose]);

  // ── Cargar replay guardado en Storage ──────────────────────────
  const loadSavedReplay = useCallback(async () => {
    if (!flightId) return;
    setState('loading');
    setProgress('Cargando replay guardado...');
    try {
      const res = await fetch(`/api/flights/${flightId}/replay`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo cargar el replay');
      }
      const { signedUrl } = await res.json();
      setProgress('Descargando datos...');
      const blob = await fetch(signedUrl);
      if (!blob.ok) throw new Error('Error al descargar el replay');
      const buf  = await blob.arrayBuffer();
      setProgress('Descomprimiendo...');
      const data = await gunzipJson(buf);
      setFlight(data);
      setFileName(flightLabel ?? 'replay guardado');
      setSaved(true);
      setState('done');
    } catch (err) {
      setError(err.message);
      setState('error');
    } finally {
      setProgress(null);
    }
  }, [flightId, flightLabel]);

  // Auto-cargar si tiene replay al abrir
  const prevOpen = useRef(false);
  if (open && !prevOpen.current && hasReplay && state === 'idle') {
    loadSavedReplay();
  }
  prevOpen.current = open;

  // ── Guardar replay en Storage ───────────────────────────────────
  const saveReplay = useCallback(async (data) => {
    if (!flightId) return;
    setSaving(true);
    try {
      setProgress('Comprimiendo replay...');
      const compressed = await gzipJson(data);
      setProgress('Guardando en la nube...');
      const res = await fetch(`/api/flights/${flightId}/replay`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body:    compressed,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('[replay-save]', err.error);
      } else {
        setSaved(true);
        if (onReplaySaved) onReplaySaved();
      }
    } catch (err) {
      console.warn('[replay-save]', err.message);
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }, [flightId, onReplaySaved]);

  const processFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.txt')) {
      setError('Solo se aceptan archivos .txt de log DJI.'); return;
    }

    setFileName(file.name);
    setState('loading');
    setError(null);
    setFlight(null);

    try {
      setProgress('Leyendo archivo localmente...');
      const arrayBuf = await file.arrayBuffer();
      const uint8    = new Uint8Array(arrayBuf);

      setProgress('Cargando parser DJI (WASM)...');
      const { DJILog } = await import('dji-log-parser-js');
      const parser = new DJILog(uint8);

      if (parser.version === 0) {
        setError('El archivo no es un log DJI válido.'); setState('error'); return;
      }

      setProgress(`Log v${parser.version} detectado. Extrayendo frames...`);
      let frames = [];

      if (parser.version < 13) {
        try { frames = parser.frames() ?? []; } catch { frames = []; }
      } else {
        setProgress('Log cifrado (v13+). Obteniendo keychains de DJI...');
        try {
          const keychains = await parser.fetchKeychains('proxy', '/api/dev/dji-keychains-proxy');
          setProgress('Descifrando frames...');
          frames = parser.frames(keychains) ?? [];
        } catch {
          try { frames = parser.frames() ?? []; } catch { frames = []; }
          if (!frames.length) {
            setError(`No se pudo descifrar el log v${parser.version}. Verifica DJI_API_KEY en Vercel.`);
            setState('error'); return;
          }
        }
      }

      if (!frames.length) {
        setError('El archivo no contiene frames de vuelo.'); setState('error'); return;
      }

      setProgress('Extrayendo telemetría y alertas...');
      const telemetry = buildTelemetry(frames);
      const gpsFrames = frames.filter(f =>
        f.osd?.latitude && Math.abs(f.osd.latitude) <= 90 && f.osd.latitude !== 0 &&
        f.osd?.longitude && Math.abs(f.osd.longitude) <= 180 && f.osd.longitude !== 0
      );

      if (!gpsFrames.length) {
        setError('El log no contiene datos GPS.'); setState('error'); return;
      }

      const MAX_PATH = 2000;
      const pathStep = gpsFrames.length > MAX_PATH ? Math.floor(gpsFrames.length / MAX_PATH) : 1;
      const path = [];
      for (let i = 0; i < gpsFrames.length; i += pathStep) {
        const f = gpsFrames[i];
        path.push({ lat: f.osd.latitude, lng: f.osd.longitude, alt: f.osd.height ?? 0, t: f.osd.flyTime ?? i * 0.1 });
      }

      const alerts  = detectAlerts(frames);
      let details   = {};
      try { details = parser.details ?? {}; } catch {}
      let records   = [];
      try { records = parser.records() ?? []; } catch {}
      const recoverRec = records.find(r => r.type === 'Recover')?.content ?? {};

      const altVals   = gpsFrames.map(f => f.osd?.height ?? 0).filter(Boolean);
      const speedVals = gpsFrames.map(f => Math.hypot(f.osd?.xSpeed ?? 0, f.osd?.ySpeed ?? 0)).filter(Boolean);
      const batVals   = frames.map(f => f.battery?.chargeLevel).filter(v => v != null);
      const totalDuration = telemetry.length > 0 ? telemetry[telemetry.length - 1].t : gpsFrames.length * 0.1;

      const meta = {
        version:      parser.version,
        totalFrames:  frames.length,
        gpsFrames:    gpsFrames.length,
        pathPoints:   path.length,
        serial:       details.aircraftSn ?? recoverRec.aircraftSn ?? null,
        model:        details.subType    ?? details.productType   ?? null,
        startTime:    details.startTime  ?? null,
        durationS:    details.totalTime  ?? totalDuration,
        totalDuration,
        altMax:       altVals.length   ? Math.max(...altVals)                              : null,
        speedMax:     speedVals.length ? Math.max(...speedVals)                            : null,
        speedAvg:     speedVals.length ? speedVals.reduce((a,b)=>a+b,0)/speedVals.length  : null,
        distanceM:    calcDistance(gpsFrames),
        batStart:     batVals[0]               ?? null,
        batEnd:       batVals[batVals.length-1] ?? null,
        hasRC:        frames.some(f => f.rc?.aileron != null),
        alertCount:   alerts.length,
      };

      const result = { path, telemetry, alerts, meta };
      setFlight(result);
      setState('done');

      // Guardar en Storage si el usuario optó y hay un flightId
      if (flightId && saveOpt) {
        saveReplay(result);
      }
    } catch (err) {
      console.error('[flight-replay]', err);
      setError('Error inesperado: ' + err.message);
      setState('error');
    } finally {
      setProgress(null);
    }
  }, [flightId, saveOpt, saveReplay]);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  // Portal target — solo disponible en el cliente
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!open || !mounted) return null;

  const modal = (
    // Overlay — renderizado en document.body vía Portal para evitar
    // problemas de stacking context del dashboard layout
    <div
      role="dialog"
      aria-modal="true"
      aria-label={flightLabel ? `Replay de vuelo: ${flightLabel}` : 'Replay de Vuelo'}
      className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* Contenedor del modal */}
      <div className="relative w-full h-full bg-slate-950 flex flex-col overflow-hidden">

        {/* Replay activo — ocupa todo el espacio */}
        {state === 'done' && flightData && (
          <FlightReplayView
            flightData={flightData}
            fileName={fileName}
            onReset={reset}
            onClose={handleClose}
            saving={saving}
            saved={saved}
          />
        )}

        {/* Pantalla de carga / upload */}
        {state !== 'done' && (
          <div className="flex-1 flex flex-col items-center justify-center">

            {/* Header */}
            <div className="mb-8 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="material-symbols-outlined text-orange-500 text-2xl">route</span>
                <h2 className="text-lg font-black uppercase tracking-tight text-white">Replay de Vuelo</h2>
              </div>
              {flightLabel && (
                <p className="text-xs text-orange-400 font-mono mt-1">{flightLabel}</p>
              )}
              <p className="text-slate-500 text-xs mt-1">Sube el archivo .txt del log DJI para visualizar el vuelo</p>
            </div>

            {/* Drop zone */}
            {state !== 'loading' && (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                role="button"
                aria-label="Subir archivo de log DJI (.txt) — arrastra o haz clic"
                tabIndex={0}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
                className={`w-80 flex flex-col items-center gap-4 p-10 rounded-3xl border-2 border-dashed cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none ${
                  dragging ? 'border-orange-400 bg-orange-950/30 scale-[1.02]'
                           : 'border-slate-700 hover:border-orange-600 hover:bg-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-5xl text-slate-600">
                  {dragging ? 'file_open' : 'upload_file'}
                </span>
                <div className="text-center">
                  <p className="text-sm font-black text-slate-300">{dragging ? 'Suelta aquí' : 'Log DJI (.txt)'}</p>
                  <p className="text-xs text-slate-500 mt-1">Arrastra o haz clic</p>
                  <p className="text-[10px] text-orange-400/70 mt-0.5 font-mono">DJI Fly · GO 4 · Pilot 2</p>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg px-3 py-1.5">
                  <span className="material-symbols-outlined text-green-500 text-xs">lock</span>
                  <p className="text-[10px] text-slate-400">Procesado localmente — el .txt no se sube</p>
                </div>
                <input ref={inputRef} type="file" accept=".txt"
                  aria-label="Seleccionar archivo de log DJI (.txt)"
                  onChange={e => processFile(e.target.files?.[0])} className="hidden" />
              </div>
            )}

            {/* Opción de guardado — solo si hay flightId vinculado */}
            {state !== 'loading' && flightId && (
              <label className="mt-4 flex items-center gap-2 cursor-pointer select-none group">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                  saveOpt ? 'bg-orange-500 border-orange-500' : 'border-slate-600 group-hover:border-slate-400'
                }`} onClick={() => setSaveOpt(v => !v)}>
                  {saveOpt && <span className="material-symbols-outlined text-white text-[10px]">check</span>}
                </div>
                <span className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors">
                  Guardar replay para próximas revisiones
                  <span className="ml-1 text-slate-600">(~100 KB en la nube)</span>
                </span>
              </label>
            )}


            {/* Loading */}
            {state === 'loading' && (
              <div className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-black text-white">{fileName}</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs text-center">{progress}</p>
                </div>
              </div>
            )}

            {/* Error */}
            {state === 'error' && error && (
              <div className="mt-4 w-80 bg-red-950/50 border border-red-800 rounded-2xl p-4">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-red-400 text-base shrink-0 mt-0.5">error</span>
                  <p className="text-xs text-red-300">{error}</p>
                </div>
                <button onClick={reset}
                  className="mt-3 w-full text-xs font-black text-slate-400 hover:text-white transition-colors">
                  Intentar con otro archivo
                </button>
              </div>
            )}

            {/* Instrucciones */}
            {state === 'idle' && (
              <div className="mt-6 text-center space-y-1">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">¿Dónde está el archivo?</p>
                <p className="text-[10px] text-slate-600">DJI RC 2: Almac. interno → DJI → FlightRecord</p>
                <p className="text-[10px] text-slate-600">Android: DJI Fly → files → FlightRecord</p>
                <p className="text-[10px] text-slate-600">iPhone: iTunes → Archivos → DJI Fly</p>
              </div>
            )}

            {/* Botón cerrar */}
            <button onClick={handleClose}
              className="mt-8 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              <span className="material-symbols-outlined text-sm">close</span>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function ModalSpinner({ text }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500">{text}</p>
      </div>
    </div>
  );
}
