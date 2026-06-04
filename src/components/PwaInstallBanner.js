'use client';
/**
 * PwaInstallBanner — Prompt de instalación PWA para controladores DJI Enterprise
 *
 * Aparece en la parte superior del dashboard cuando:
 *   1. El navegador dispara el evento `beforeinstallprompt` (Chrome/Android/DJI RC)
 *   2. O el user-agent es DJI RC y la app NO corre en standalone
 *
 * Comportamiento:
 *   - Se muestra UNA sola vez por sesión (sessionStorage)
 *   - Botón "Instalar" dispara el prompt nativo del SO
 *   - Botón "×" lo oculta y no vuelve a aparecer en esa sesión
 *   - En DJI RC que no soporta beforeinstallprompt: muestra instrucciones manuales
 */

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [isDjiRc, setIsDjiRc] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Ya corre como app instalada (standalone) → no mostrar
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (window.navigator.standalone === true) return; // iOS Safari

    // Ya fue descartado en esta sesión
    if (sessionStorage.getItem('pwa-banner-dismissed')) return;

    // Detectar DJI RC Browser
    const ua = navigator.userAgent || '';
    const dji = /DJI|RC\s*Pro|Smart\s*Controller/i.test(ua);
    setIsDjiRc(dji);

    // Escuchar el evento nativo de Chrome/Android/DJI RC
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // En DJI RC el evento puede no dispararse — mostrar banner manual
    if (dji) {
      const timer = setTimeout(() => {
        if (!sessionStorage.getItem('pwa-banner-dismissed')) {
          setVisible(true);
        }
      }, 3000); // 3s después del mount para no interferir con el load
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        clearTimeout(timer);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Escuchar si ya se instaló
  useEffect(() => {
    const handler = () => {
      setInstalled(true);
      setVisible(false);
    };
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  if (!visible || installed) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setVisible(false);
        sessionStorage.setItem('pwa-banner-dismissed', '1');
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem('pwa-banner-dismissed', '1');
  };

  // Banner para DJI RC sin prompt nativo
  if (isDjiRc && !deferredPrompt) {
    return (
      <div
        role="banner"
        className="w-full bg-navy text-white px-4 py-3 flex items-start gap-3 relative"
        style={{ borderBottom: '2px solid #ec5b13' }}
      >
        <Image src="/icons/icon-192.png" alt="" width={36} height={36}
          className="rounded-xl shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black uppercase tracking-widest text-primary mb-0.5">
            Instala Bitafly en tu controlador DJI
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            Toca el menú del navegador{' '}
            <span className="inline-flex items-center gap-0.5 bg-white/10 px-1.5 py-0.5 rounded font-mono text-xs">⋮</span>
            {' '}→{' '}
            <strong className="text-white">«Añadir a pantalla de inicio»</strong>{' '}
            para acceso rápido sin navegador.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Cerrar banner de instalación"
          className="shrink-0 text-slate-400 hover:text-white transition-colors p-1 mt-0.5"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
    );
  }

  // Banner estándar con prompt nativo (Chrome / Android)
  return (
    <div
      role="banner"
      className="w-full bg-navy text-white px-4 py-3 flex items-center gap-3 relative"
      style={{ borderBottom: '2px solid #ec5b13' }}
    >
      <Image src="/icons/icon-192.png" alt="" width={36} height={36}
        className="rounded-xl shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black uppercase tracking-widest text-primary mb-0.5">
          Instala la app Bitafly
        </p>
        <p className="text-xs text-slate-300 hidden sm:block">
          Acceso rápido, modo offline y sin barra de navegador.
        </p>
      </div>
      <button
        onClick={handleInstall}
        className="shrink-0 bg-primary text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all"
      >
        Instalar
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Cerrar"
        className="shrink-0 text-slate-400 hover:text-white transition-colors p-1"
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  );
}
