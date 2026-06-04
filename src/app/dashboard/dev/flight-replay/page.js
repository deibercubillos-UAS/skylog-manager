'use client';
import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

const FlightReplayView = dynamic(
  () => import('@/components/dev/FlightReplayView'),
  { ssr: false, loading: () => <LoadingMap text="Cargando visor..." /> }
);

// ── Alertas: detectar rising-edge por condición ─────────────────
const ALERT_DEFS = [
  { key: 'isCompassError',        label: 'Error de brújula',              severity: 'critical' },
  { key: 'isVibrating',           label: 'Vibraciones anormales',         severity: 'warning'  },
  { key: 'waveError',             label: 'Error evasión obstáculos',      severity: 'warning'  },
  { key: 'isOutOfLimit',          label: 'Fuera del límite de vuelo',     severity: 'critical' },
  { key: 'isNotEnoughForce',      label: 'Empuje insuficiente',           severity: 'critical' },
  { key: 'isBarometerDeadInAir',  label: 'Fallo barómetro en vuelo',      severity: 'critical' },
  { key: 'isMotorBlocked',        label: 'Motor bloqueado',               severity: 'critical' },
  { key: 'isPropellerCatapult',   label: 'Protección hélice activa',      severity: 'warning'  },
  { key: 'isAcceletorOverRange',  label: 'Acelerómetro fuera de rango',   severity: 'warning'  },
];

const FLIGHT_ACTION_ALERTS = new Set([
  'WarningPowerGoHome', 'WarningPowerLanding', 'SmartPowerGoHome', 'SmartPowerLanding',
  'LowVoltageLanding', 'LowVoltageGoHome', 'SeriousLowVoltageLanding',
  'OutOfControlGoHome', 'AvoidGroundLanding', 'BatteryForceLanding', 'MCProtectGoHome',
  'MotorblockLanding', 'AppRequestForceLanding', 'FakeBatteryLanding', 'IMUErrorRTH',
]);
const FLIGHT_ACTION_LABELS = {
  WarningPowerGoHome:         'RTH por batería baja (advertencia)',
  WarningPowerLanding:        'Aterrizaje por batería baja (advertencia)',
  SmartPowerGoHome:           'RTH inteligente por batería baja',
  SmartPowerLanding:          'Aterrizaje inteligente por batería baja',
  LowVoltageLanding:          'Aterrizaje por voltaje bajo',
  LowVoltageGoHome:           'RTH por voltaje bajo',
  SeriousLowVoltageLanding:   'ATERRIZAJE DE EMERGENCIA — voltaje crítico',
  OutOfControlGoHome:         'RTH por pérdida de señal RC',
  AvoidGroundLanding:         'Aterrizaje por proximidad al suelo',
  BatteryForceLanding:        'Aterrizaje forzado por batería',
  MCProtectGoHome:            'RTH por protección del controlador',
  MotorblockLanding:          'Aterrizaje por bloqueo de motor',
  AppRequestForceLanding:     'Aterrizaje forzado por la app',
  FakeBatteryLanding:         'Aterrizaje — batería no reconocida',
  IMUErrorRTH:                'RTH por error IMU',
};

function detectAlerts(frames) {
  const alerts = [];
  const prev = {};
  let prevAction = null;
  let prevVoltWarn = 0;

  frames.forEach((f) => {
    const osd = f.osd;
    if (!osd) return;
    const t = osd.flyTime ?? 0;

    // Flags booleanos — rising edge
    ALERT_DEFS.forEach(({ key, label, severity }) => {
      if (osd[key] && !prev[key]) {
        alerts.push({ t, type: key, label, severity });
      }
      prev[key] = osd[key];
    });

    // Voltage warning level change
    const vw = osd.voltageWarning ?? 0;
    if (vw > prevVoltWarn) {
      alerts.push({
        t, type: 'voltageWarning', severity: vw >= 2 ? 'critical' : 'warning',
        label: vw >= 2 ? 'Voltaje CRÍTICO — aterrizaje inminente' : 'Advertencia de voltaje bajo',
      });
    }
    prevVoltWarn = vw;

    // FlightAction — solo los problemáticos, rising edge
    const action = typeof osd.flightAction === 'string' ? osd.flightAction : null;
    if (action && action !== prevAction && FLIGHT_ACTION_ALERTS.has(action)) {
      alerts.push({
        t, type: 'flightAction', severity: 'critical',
        label: FLIGHT_ACTION_LABELS[action] ?? action,
      });
    }
    prevAction = action;
  });

  return alerts;
}

// ── Normalizar valores RC (0-1 → -1..+1, o 0-1024 → -1..+1) ────
function normalizeRC(val) {
  if (val == null) return 0;
  if (val > 2) return (val / 1024) * 2 - 1; // raw 0-1024
  return (val - 0.5) * 2;                    // float 0-1
}

// ── Extraer telemetría densa para animación ─────────────────────
function buildTelemetry(frames) {
  const MAX = 12000;
  const step = frames.length > MAX ? Math.floor(frames.length / MAX) : 1;
  const out  = [];

  for (let i = 0; i < frames.length; i += step) {
    const f   = frames[i];
    const osd = f.osd;
    const bat = f.battery;
    const rc  = f.rc;
    if (!osd) continue;

    out.push({
      t:           osd.flyTime        ?? i * 0.1,
      lat:         osd.latitude       ?? null,
      lng:         osd.longitude      ?? null,
      alt:         osd.height         ?? osd.altitude ?? 0,
      yaw:         osd.yaw            ?? 0,
      pitch:       osd.pitch          ?? 0,
      roll:        osd.roll           ?? 0,
      speedH:      Math.hypot(osd.xSpeed ?? 0, osd.ySpeed ?? 0),
      speedV:      osd.zSpeed         ?? 0,
      gpsNum:      osd.gpsNum         ?? 0,
      flightMode:  typeof osd.flycState === 'string' ? osd.flycState
                 : typeof osd.flightMode === 'string' ? osd.flightMode : null,
      flightAction: typeof osd.flightAction === 'string' ? osd.flightAction : null,
      bat:         bat?.chargeLevel   ?? null,
      voltage:     bat?.voltage       ?? null,
      cellVolts:   bat?.cellVoltages  ?? null,
      rc_ail:      rc ? normalizeRC(rc.aileron)  : null,  // right X
      rc_ele:      rc ? normalizeRC(rc.elevator) : null,  // right Y
      rc_thr:      rc ? normalizeRC(rc.throttle) : null,  // left  Y
      rc_rud:      rc ? normalizeRC(rc.rudder)   : null,  // left  X
      hasGps:      !!(osd.latitude && Math.abs(osd.latitude) <= 90 && osd.latitude !== 0),
    });
  }
  return out;
}

// ── Distancia total haversine ────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────
export default function FlightReplayPage() {
  const [state, setState]       = useState('idle');
  const [flightData, setFlight] = useState(null);
  const [error, setError]       = useState(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [progress, setProgress] = useState(null);
  const inputRef = useRef(null);

  // ── Flujo .dat: subida directa al Railway ──────────────────────
  const processDatFile = useCallback(async (file) => {
    setFileName(file.name);
    setState('loading');
    setError(null);
    setFlight(null);
    setProgress('Obteniendo endpoint de procesamiento...');

    try {
      // 1. Obtener URL + secret del Railway vía Vercel (evita exponer el secret)
      const urlRes = await fetch('/api/dev/dat-parse');
      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo conectar al microservicio Railway.');
      }
      const { uploadUrl, secret } = await urlRes.json();

      // 2. Subir el .dat directamente al Railway con progreso
      setProgress(`Subiendo ${(file.size / 1024 / 1024).toFixed(0)} MB al procesador...`);

      const form = new FormData();
      form.append('file', file);

      // XMLHttpRequest para poder trackear progreso de subida
      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('x-api-secret', secret);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setProgress(`Subiendo al procesador: ${pct}% (${(e.loaded/1024/1024).toFixed(0)}/${(e.total/1024/1024).toFixed(0)} MB)`);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch { reject(new Error('Respuesta inválida del procesador')); }
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error || `Error ${xhr.status} en el procesador`));
            } catch { reject(new Error(`Error ${xhr.status} en el procesador Railway`)); }
          }
        };
        xhr.onerror = () => reject(new Error('Error de red al conectar con Railway. Verifica que el robot esté activo.'));
        xhr.send(form);
      });

      setProgress('Procesando resultado...');

      if (!result.path?.length) {
        throw new Error('El archivo no contiene datos GPS válidos.');
      }

      // El resultado de Railway ya tiene el mismo schema que .txt
      // pero con meta.source = 'dat' y campos extra (hasMotors, hasImu)
      setFlight(result);
      setState('done');

    } catch (err) {
      console.error('[dat-upload]', err);
      setError(err.message);
      setState('error');
    } finally {
      setProgress(null);
    }
  }, []);

  const processFile = useCallback(async (file) => {
    if (!file) return;
    const isDat = file.name.toLowerCase().endsWith('.dat');
    const isTxt = file.name.toLowerCase().endsWith('.txt');
    if (!isDat && !isTxt) {
      setError('Solo se aceptan archivos .txt o .dat de log DJI.'); return;
    }
    // Archivos .dat → Railway (pueden pesar 500MB)
    if (isDat) { processDatFile(file); return; }

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
        } catch (e) {
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

      // ── Telemetría densa para animación ──────────────────────
      const telemetry = buildTelemetry(frames);

      // ── GPS frames para el mapa estático ─────────────────────
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

      // ── Alertas ───────────────────────────────────────────────
      const alerts = detectAlerts(frames);

      // ── Meta ──────────────────────────────────────────────────
      let details = {};
      try { details = parser.details ?? {}; } catch {}
      let records = [];
      try { records = parser.records() ?? []; } catch {}
      const recoverRec = records.find(r => r.type === 'Recover')?.content ?? {};

      const altVals   = gpsFrames.map(f => f.osd?.height ?? 0).filter(Boolean);
      const speedVals = gpsFrames.map(f => Math.hypot(f.osd?.xSpeed ?? 0, f.osd?.ySpeed ?? 0)).filter(Boolean);
      const batVals   = frames.map(f => f.battery?.chargeLevel).filter(v => v != null);

      const totalDuration = telemetry.length > 0
        ? telemetry[telemetry.length - 1].t
        : gpsFrames.length * 0.1;

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
        altMax:       altVals.length   ? Math.max(...altVals)                         : null,
        speedMax:     speedVals.length ? Math.max(...speedVals)                       : null,
        speedAvg:     speedVals.length ? speedVals.reduce((a,b)=>a+b,0)/speedVals.length : null,
        distanceM:    calcDistance(gpsFrames),
        batStart:     batVals[0]              ?? null,
        batEnd:       batVals[batVals.length-1] ?? null,
        hasRC:        frames.some(f => f.rc?.aileron != null),
        alertCount:   alerts.length,
      };

      setFlight({ path, telemetry, alerts, meta });
      setState('done');
    } catch (err) {
      console.error('[flight-replay]', err);
      setError('Error inesperado: ' + err.message);
      setState('error');
    } finally {
      setProgress(null);
    }
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const reset = () => { setState('idle'); setFlight(null); setError(null); setFileName(null); };

  // ── Vista del replay ─────────────────────────────────────────
  if (state === 'done' && flightData) {
    return (
      <FlightReplayView
        flightData={flightData}
        fileName={fileName}
        onReset={reset}
      />
    );
  }

  // ── Upload / Error / Loading ─────────────────────────────────
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-950 animate-in fade-in duration-500">

      {/* Header badge */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="material-symbols-outlined text-orange-500 text-3xl">route</span>
          <h1 className="text-xl font-black uppercase tracking-tight text-white">Replay de Vuelo</h1>
          <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px] font-black uppercase">DEV</span>
        </div>
        <p className="text-slate-500 text-xs">.txt → browser (WASM) · .dat → Railway (datos completos + motores)</p>
      </div>

      {/* Drop zone */}
      {state !== 'loading' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`w-80 flex flex-col items-center gap-4 p-10 rounded-3xl border-2 border-dashed cursor-pointer transition-all ${
            dragging ? 'border-orange-400 bg-orange-950/30 scale-[1.02]'
                     : 'border-slate-700 hover:border-orange-600 hover:bg-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-5xl text-slate-600">
            {dragging ? 'file_open' : 'upload_file'}
          </span>
          <div className="text-center">
            <p className="text-sm font-black text-slate-300">{dragging ? 'Suelta aquí' : 'Sube el log DJI'}</p>
            <p className="text-xs text-slate-500 mt-1">Arrastra o haz clic</p>
                  <p className="text-[10px] text-orange-400/70 mt-0.5 font-mono">.txt (browser) · .dat (Railway)</p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg px-3 py-1.5">
            <span className="material-symbols-outlined text-green-500 text-xs">lock</span>
            <p className="text-[10px] text-slate-400">El archivo no se sube — procesado en el browser</p>
          </div>
          <input ref={inputRef} type="file" accept=".txt,.dat"
            onChange={e => processFile(e.target.files?.[0])} className="hidden" />
        </div>
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
            <p className="text-xs text-red-300 whitespace-pre-line">{error}</p>
          </div>
        </div>
      )}

      {/* Instrucciones */}
      {state === 'idle' && (
        <div className="mt-6 text-center space-y-1">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">¿Cómo obtener el archivo?</p>
          <p className="text-[10px] text-slate-600">DJI RC 2: Almac. interno → DJI → FlightRecord</p>
          <p className="text-[10px] text-slate-600">Android: DJI Fly → files → FlightRecord</p>
          <p className="text-[10px] text-slate-600">iPhone: iTunes → Archivos → DJI Fly</p>
        </div>
      )}
    </div>
  );
}

function LoadingMap({ text }) {
  return (
    <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500">{text}</p>
      </div>
    </div>
  );
}
