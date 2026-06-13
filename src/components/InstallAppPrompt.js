'use client';
import { useState, useEffect } from 'react';

// Banner de instalación PWA.
//  - Android / Chrome escritorio: captura `beforeinstallprompt` → botón "Instalar".
//  - iOS Safari: no hay evento → muestra instrucciones "Agregar a pantalla de inicio".
//  - Oculto si ya está instalada (display-mode: standalone) o si el usuario descartó.
const DISMISS_KEY = 'bitafly_install_dismissed';

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // iOS
  );
}

export default function InstallAppPrompt() {
  const [deferred, setDeferred] = useState(null); // evento beforeinstallprompt
  const [visible, setVisible]   = useState(false);
  const [isIOS, setIsIOS]       = useState(false);

  useEffect(() => {
    if (isStandalone()) return;                 // ya instalada
    try { if (localStorage.getItem(DISMISS_KEY) === '1') return; } catch { /* no-op */ }

    const ua = navigator.userAgent || '';
    const ios = /iPhone|iPad|iPod/i.test(ua);
    // Safari iOS no soporta beforeinstallprompt → mostramos instrucciones manuales
    const iosSafari = ios && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);

    const onBIP = (e) => {
      e.preventDefault();          // evita el mini-infobar nativo
      setDeferred(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBIP);

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* no-op */ }
    };
    window.addEventListener('appinstalled', onInstalled);

    if (iosSafari) {
      setIsIOS(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* no-op */ }
  };

  const handleInstall = async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch { /* no-op */ }
    setDeferred(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[250] px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] lg:bottom-4 lg:left-auto lg:right-4 lg:px-0 lg:max-w-sm pointer-events-none">
      <div className="pointer-events-auto bg-white border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.14)] p-4 flex items-start gap-3 animate-in slide-in-from-bottom duration-300">
        <div className="size-11 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-orange-600">install_mobile</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-slate-900 leading-tight">Instala BitaFly</p>
          {isIOS ? (
            <p className="text-xs text-slate-500 font-medium leading-snug mt-1">
              Toca{' '}
              <span className="material-symbols-outlined text-sm align-middle text-blue-500">ios_share</span>{' '}
              <span className="font-bold">Compartir</span> y luego{' '}
              <span className="font-bold">“Agregar a pantalla de inicio”</span>.
            </p>
          ) : (
            <p className="text-xs text-slate-500 font-medium leading-snug mt-1">
              Accede más rápido y trabaja sin conexión desde tu pantalla de inicio.
            </p>
          )}

          {!isIOS && (
            <button
              onClick={handleInstall}
              className="mt-3 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
            >
              Instalar app
            </button>
          )}
        </div>

        <button
          onClick={dismiss}
          aria-label="Cerrar"
          className="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
    </div>
  );
}
