'use client';

/**
 * PwaInstallBanner
 *
 * Detecta si la app ya está instalada como PWA y si el dispositivo es elegible.
 * Muestra un banner con instrucciones específicas para:
 *   - DJI RC Plus (Android 10, Chrome 88+)
 *   - DJI Smart Controller Enterprise (Android 9)
 *   - Android genérico (otro control o celular)
 *   - iOS (iPhone/iPad — no usa controles DJI pero sí algunos pilotos)
 *
 * Se oculta permanentemente con el botón "×" (localStorage).
 * Se oculta automáticamente si la app ya está en modo standalone.
 */

import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'bitafly_pwa_dismissed';

// Detectar modelo de control DJI por user-agent
function detectDevice(ua) {
  if (!ua) return 'unknown';
  const u = ua.toLowerCase();
  // DJI RC Plus — aparece como "dji rc plus" o "rcplus" en el UA custom de DJI
  if (u.includes('dji rc plus') || u.includes('rcplus'))   return 'dji-rc-plus';
  // DJI Smart Controller / Enterprise Controller
  if (u.includes('dji') && (u.includes('smart') || u.includes('enterprise'))) return 'dji-smart';
  // Cualquier otro Android con "dji" en el UA (RC Pro, RC 2 con Chrome instalado)
  if (u.includes('dji'))                                    return 'dji-generic';
  if (u.includes('iphone') || u.includes('ipad'))          return 'ios';
  if (u.includes('android'))                               return 'android';
  return 'desktop';
}

const INSTRUCTIONS = {
  'dji-rc-plus': {
    label: 'DJI RC Plus detectado',
    icon: 'flight_takeoff',
    color: 'bg-sky-900/80 border-sky-500/40',
    accent: 'text-sky-400',
    steps: [
      'Toca los tres puntos ⋮ en la esquina superior derecha de Chrome',
      'Selecciona "Añadir a la pantalla de inicio"',
      'Confirma con "Añadir" — el ícono aparecerá en el escritorio del control',
      'Abre Bitafly desde el escritorio para experiencia de pantalla completa',
    ],
  },
  'dji-smart': {
    label: 'DJI Smart Controller detectado',
    icon: 'flight_takeoff',
    color: 'bg-sky-900/80 border-sky-500/40',
    accent: 'text-sky-400',
    steps: [
      'Toca los tres puntos ⋮ en la barra superior del navegador',
      'Selecciona "Añadir a pantalla de inicio"',
      'Dale un nombre (ej: "Bitafly") y confirma',
      'Accede desde el escritorio del Smart Controller para modo app',
    ],
  },
  'dji-generic': {
    label: 'Control DJI detectado',
    icon: 'flight_takeoff',
    color: 'bg-sky-900/80 border-sky-500/40',
    accent: 'text-sky-400',
    steps: [
      'Abre el menú del navegador (⋮ o ···)',
      'Busca "Añadir a pantalla de inicio" o "Instalar app"',
      'Confirma la instalación',
      'Bitafly se ejecutará en pantalla completa sin barra del navegador',
    ],
  },
  'android': {
    label: 'Instalar como app',
    icon: 'install_mobile',
    color: 'bg-slate-800 border-slate-600/50',
    accent: 'text-orange-400',
    steps: [
      'Toca los tres puntos ⋮ en Chrome',
      'Selecciona "Añadir a la pantalla de inicio"',
      'Confirma — Bitafly se instala como app nativa',
    ],
  },
  'ios': {
    label: 'Instalar en iPhone / iPad',
    icon: 'install_mobile',
    color: 'bg-slate-800 border-slate-600/50',
    accent: 'text-orange-400',
    steps: [
      'Toca el botón Compartir ⎙ en la barra de Safari',
      'Desplázate y selecciona "Añadir a la pantalla de inicio"',
      'Confirma con "Añadir"',
    ],
  },
};

export default function PwaInstallBanner() {
  const [show, setShow]           = useState(false);
  const [device, setDevice]       = useState('unknown');
  const [installable, setInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Ya está instalada como PWA standalone — no mostrar
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Usuario ya la descartó
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const ua = navigator.userAgent;
    const detected = detectDevice(ua);
    setDevice(detected);

    // No mostrar en desktop (solo mobile / controles DJI)
    if (detected === 'desktop') return;

    setShow(true);

    // Capturar el evento nativo de instalación de Chrome (Android)
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setShow(false);
  }

  async function handleInstallClick() {
    if (deferredPrompt) {
      // Usar el prompt nativo de Chrome si está disponible
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShow(false);
        localStorage.setItem(DISMISSED_KEY, '1');
      }
      setDeferredPrompt(null);
    }
  }

  if (!show) return null;

  const info = INSTRUCTIONS[device] || INSTRUCTIONS['android'];

  return (
    <div className={`
      mx-3 mb-3 rounded-2xl border p-4
      ${info.color}
      backdrop-blur-sm
      animate-in slide-in-from-top-2 duration-300
    `}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined text-xl ${info.accent}`}>
            {info.icon}
          </span>
          <div>
            <p className={`text-xs font-black uppercase tracking-wide ${info.accent}`}>
              Instalar Bitafly
            </p>
            <p className="text-xs text-slate-400 font-medium">{info.label}</p>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1 -mr-1 -mt-1"
          aria-label="Cerrar"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>

      {/* Pasos */}
      <ol className="space-y-1.5 mb-3">
        {info.steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
            <span className={`
              flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center
              text-[10px] font-black mt-0.5
              ${info.accent} bg-white/10
            `}>
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      {/* Botón de instalación directa si hay beforeinstallprompt */}
      {installable && (
        <button
          onClick={handleInstallClick}
          className="w-full bg-orange-600 hover:bg-orange-500 active:bg-orange-700
            text-white text-xs font-black uppercase tracking-wide
            rounded-xl py-2.5 transition-colors"
        >
          <span className="material-symbols-outlined text-sm align-middle mr-1">install_mobile</span>
          Instalar ahora
        </button>
      )}

      <p className="text-[10px] text-slate-500 text-center mt-2">
        Sin espacio extra · funciona sin internet · acceso instantáneo
      </p>
    </div>
  );
}
