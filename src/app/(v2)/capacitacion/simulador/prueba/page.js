'use client';

// Simulador 3D — prueba de equipo de la Fase 0 (docs/skylog-v2/45-simulador-3d-plan.md, entregables 0.2 y 0.3).
// Página sin enlace en el menú: se abre en cada equipo a evaluar (celulares y control RC Plus 2), corre una prueba
// automática de rendimiento en 3 calidades y muestra un informe para copiar y enviar. También detecta si el control
// entrega sus palancas o botones al navegador (gamepad o teclas). No guarda nada en la base.
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { SectionHero } from '../../../_components/SectionHero';
import { Button } from '@skylog/ui';

const PrototypeScene = dynamic(() => import('./_Prototype').then((m) => m.PrototypeScene), { ssr: false });
const TouchStick = dynamic(() => import('./_Prototype').then((m) => m.TouchStick), { ssr: false });

const LEVELS = ['alto', 'medio', 'bajo'];
const LEVEL_LABEL = { alto: 'Alto', medio: 'Medio', bajo: 'Bajo' };
const LEVEL_ADJ = { alto: 'alta', medio: 'media', bajo: 'baja' };
const WARMUP_MS = 2000;
const MEASURE_MS = 10000;

function stats(deltas) {
  if (!deltas.length) return null;
  const ms = deltas.map((d) => d * 1000).sort((a, b) => a - b);
  const avg = ms.reduce((a, b) => a + b, 0) / ms.length;
  const p99 = ms[Math.min(ms.length - 1, Math.floor(ms.length * 0.99))];
  return { fps: 1000 / avg, low1: 1000 / p99, frames: ms.length, worstMs: ms[ms.length - 1] };
}

function deviceInfo() {
  if (typeof window === 'undefined') return {};
  return {
    ua: navigator.userAgent,
    screen: `${window.screen.width}×${window.screen.height}`,
    dpr: window.devicePixelRatio,
    cores: navigator.hardwareConcurrency || '—',
    memory: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : '—',
  };
}

export default function SimulatorPrototypePage() {
  const [device, setDevice] = useState({});
  const [gpu, setGpu] = useState(null);
  const [run, setRun] = useState(null); // { mode: 'auto'|'libre', quality, level }
  const [cameraMode, setCameraMode] = useState('seguimiento');
  const [results, setResults] = useState([]);
  const [firstFrameMs, setFirstFrameMs] = useState(null);
  const [hud, setHud] = useState(null);
  const [copied, setCopied] = useState(false);
  const [gamepads, setGamepads] = useState([]);
  const [keys, setKeys] = useState([]);

  const deltas = useRef([]);
  const measuring = useRef(false);
  const startedAt = useRef(0);
  const gotFirstFrame = useRef(false);
  const inputRef = useRef({ throttle: 0, yaw: 0, pitch: 0, roll: 0 });
  const timers = useRef([]);

  useEffect(() => { setDevice(deviceInfo()); }, []);

  // Detección de palancas/botones del control: estándar Gamepad del navegador + teclas.
  useEffect(() => {
    const poll = setInterval(() => {
      const list = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).filter(Boolean);
      setGamepads(list.map((g) => ({
        id: g.id,
        axes: g.axes.map((a) => a.toFixed(2)),
        pressed: g.buttons.map((b, i) => (b.pressed ? i : null)).filter((i) => i !== null),
      })));
      const g = list[0];
      if (g && run?.mode === 'libre') {
        // Modo 2: izquierda = acelerador/guiñada, derecha = cabeceo/alabeo. El orden real de ejes del control está por verificar.
        inputRef.current = { yaw: g.axes[0] || 0, throttle: -(g.axes[1] || 0), roll: g.axes[2] || 0, pitch: -(g.axes[3] || 0) };
      }
    }, 100);
    const onKey = (e) => setKeys((k) => [`${e.type === 'keydown' ? '↓' : '↑'} key=${e.key} code=${e.code} keyCode=${e.keyCode}`, ...k].slice(0, 12));
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => { clearInterval(poll); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); };
  }, [run?.mode]);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const onFrame = useCallback((delta) => {
    if (!gotFirstFrame.current) {
      gotFirstFrame.current = true;
      setFirstFrameMs((v) => v ?? Math.round(performance.now() - startedAt.current));
    }
    if (measuring.current) deltas.current.push(delta);
  }, []);

  async function enterFullscreen() {
    try { await document.documentElement.requestFullscreen?.(); } catch { /* el navegador puede negarlo */ }
    try { await window.screen.orientation?.lock?.('landscape'); } catch { /* no todos lo permiten */ }
  }

  function exitRun() {
    clearTimers();
    measuring.current = false;
    setRun(null);
    setHud(null);
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch { /* sin pantalla completa */ }
  }

  function runLevel(i, acc) {
    if (i >= LEVELS.length) {
      setResults(acc);
      exitRun();
      return;
    }
    const quality = LEVELS[i];
    deltas.current = [];
    measuring.current = false;
    setRun({ mode: 'auto', quality, level: i });
    timers.current.push(setTimeout(() => { measuring.current = true; }, WARMUP_MS));
    timers.current.push(setTimeout(() => {
      measuring.current = false;
      runLevel(i + 1, [...acc, { quality, ...stats(deltas.current) }]);
    }, WARMUP_MS + MEASURE_MS));
  }

  async function startAuto() {
    setResults([]);
    setCopied(false);
    setFirstFrameMs(null);
    gotFirstFrame.current = false;
    startedAt.current = performance.now();
    await enterFullscreen();
    runLevel(0, []);
  }

  async function startFree(quality) {
    startedAt.current = performance.now();
    gotFirstFrame.current = false;
    inputRef.current = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };
    await enterFullscreen();
    setRun({ mode: 'libre', quality });
  }

  const verdict = (r) => (r.fps >= 55 ? 'Excelente' : r.fps >= 30 ? 'Aceptable' : 'Insuficiente');

  const report = [
    'BitaFly · Simulador 3D · Prueba de equipo (Fase 0)',
    `Fecha: ${new Date().toLocaleString('es-CO')}`,
    `Equipo: ${device.ua || '—'}`,
    `Pantalla: ${device.screen} · densidad ${device.dpr} · núcleos ${device.cores} · memoria ${device.memory}`,
    `GPU: ${gpu || '—'}`,
    `Primer cuadro: ${firstFrameMs != null ? `${firstFrameMs} ms` : '—'}`,
    ...results.map((r) => `${LEVEL_LABEL[r.quality]}: ${r.fps?.toFixed(1)} fps promedio · 1% más lento ${r.low1?.toFixed(1)} fps · peor cuadro ${r.worstMs?.toFixed(0)} ms · ${r.frames} cuadros → ${verdict(r)}`),
    `Gamepad detectado: ${gamepads.length ? gamepads.map((g) => `${g.id} (${g.axes.length} ejes)`).join(' | ') : 'ninguno'}`,
    `Teclas recibidas del control: ${keys.length ? keys.slice(0, 6).join(' · ') : 'ninguna'}`,
  ].join('\n');

  async function copyReport() {
    try { await navigator.clipboard.writeText(report); setCopied(true); } catch { setCopied(false); }
  }

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="Capacitación · Simulador 3D"
        title="Prueba de equipo"
        description="Prototipo de la Fase 0: mide si este celular o control mueve el simulador con fluidez y si el control entrega sus palancas. No es el simulador ni guarda nada."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-navy-100 bg-white p-5 space-y-3">
          <p className="text-sm font-bold text-navy">1. Prueba automática de rendimiento</p>
          <p className="text-xs text-navy-400">Dura unos 40 segundos y pasa por 3 calidades (alta, media y baja). Deja el equipo quieto y conectado.</p>
          <Button onClick={startAuto} disabled={!!run}>Iniciar prueba automática</Button>
        </div>
        <div className="rounded-2xl border border-navy-100 bg-white p-5 space-y-3">
          <p className="text-sm font-bold text-navy">2. Vuelo libre (sensación de control)</p>
          <p className="text-xs text-navy-400">Palancas en pantalla, modo 2: izquierda sube/baja y gira; derecha avanza y se desplaza. Si el control entrega un gamepad, también se usa.</p>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <Button key={l} variant="secondary" onClick={() => startFree(l)} disabled={!!run}>Calidad {LEVEL_ADJ[l]}</Button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-navy-100 bg-white p-5 space-y-2">
        <p className="text-sm font-bold text-navy">3. Palancas y botones del control</p>
        <p className="text-xs text-navy-400">Mueve las palancas y pulsa los botones físicos del control (C1, C2, retorno, pausa, rueda). Si aparece algo aquí, el control los entrega al navegador.</p>
        <div className="text-xs font-mono bg-navy-50 rounded-xl p-3 space-y-1 overflow-x-auto">
          {gamepads.length === 0 && <p className="text-navy-400">Gamepad: ninguno detectado (en algunos equipos aparece solo después de mover una palanca o pulsar un botón).</p>}
          {gamepads.map((g, i) => (
            <p key={i}>{g.id} · ejes [{g.axes.join(', ')}] · botones [{g.pressed.join(', ')}]</p>
          ))}
          {keys.length === 0 ? <p className="text-navy-400">Teclas: ninguna recibida.</p> : keys.map((k, i) => <p key={i}>{k}</p>)}
        </div>
      </div>

      {(results.length > 0 || firstFrameMs != null) && (
        <div className="rounded-2xl border border-navy-100 bg-white p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-navy">Informe</p>
            <Button variant="secondary" onClick={copyReport}>{copied ? 'Copiado ✓' : 'Copiar informe'}</Button>
          </div>
          <pre className="text-xs whitespace-pre-wrap bg-navy-50 rounded-xl p-3 overflow-x-auto">{report}</pre>
          <p className="text-xs text-navy-400">Envía este informe por el chat. Objetivo de la Fase 0: al menos 30 fps en calidad media o baja.</p>
        </div>
      )}

      {run && createPortal(
        <div className="fixed inset-0 z-[400] bg-black">
          <PrototypeScene
            quality={run.quality}
            mode={run.mode}
            cameraMode={cameraMode}
            inputRef={inputRef}
            onReady={(info) => setGpu(info.gpu)}
            onFrame={onFrame}
            onHud={setHud}
          />
          <div className="absolute top-0 inset-x-0 flex flex-wrap items-center justify-between gap-2 p-3 text-white text-xs font-mono pointer-events-none">
            <div className="bg-black/50 rounded-lg px-3 py-1.5">
              {run.mode === 'auto' ? `Midiendo · calidad ${LEVEL_ADJ[run.quality]} (${run.level + 1}/3)` : `Vuelo libre · calidad ${LEVEL_ADJ[run.quality]}`}
            </div>
            {hud && (
              <div className="bg-black/50 rounded-lg px-3 py-1.5">
                H {hud.alt.toFixed(1)} m · VH {hud.hs.toFixed(1)} m/s · VV {hud.vs.toFixed(1)} m/s · D {hud.dist.toFixed(0)} m · Rumbo {hud.hdg.toFixed(0)}°
              </div>
            )}
            <div className="flex gap-2 pointer-events-auto">
              <button type="button" onClick={() => setCameraMode((c) => (c === 'piloto' ? 'seguimiento' : 'piloto'))} className="bg-black/50 rounded-lg px-3 py-1.5">
                Cámara: {cameraMode === 'piloto' ? 'piloto en tierra' : 'seguimiento'}
              </button>
              <button type="button" onClick={exitRun} className="bg-red-600/80 rounded-lg px-3 py-1.5">Salir</button>
            </div>
          </div>
          {run.mode === 'libre' && (
            <div className="absolute bottom-0 inset-x-0 flex justify-between p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <TouchStick label="Palanca izquierda" onChange={(x, y) => { inputRef.current = { ...inputRef.current, yaw: x, throttle: y }; }} />
              <TouchStick label="Palanca derecha" onChange={(x, y) => { inputRef.current = { ...inputRef.current, roll: x, pitch: y }; }} />
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
