'use client';

/**
 * OnboardingBanner
 *
 * Se muestra en el sidebar cuando la organización aún no tiene aeronaves registradas
 * (señal de que el gerente acaba de crear la cuenta).
 *
 * Acciones:
 *   - "Descargar plantilla" → descarga el .xlsx de onboarding
 *   - "Subir plantilla"     → redirige a Ajustes → sección Inicio Rápido
 *   - "×"                  → oculta el banner y lo persiste en localStorage
 *
 * No se muestra:
 *   - Si la org ya tiene aeronaves (aircraftCount > 0)
 *   - Si el usuario ya lo descartó (localStorage)
 *   - En modo standalone PWA (ya instalado)
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

const DISMISSED_KEY = 'bitafly_onboarding_banner_dismissed';

export default function OnboardingBanner({ aircraftCount }) {
    const [show, setShow]             = useState(false);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        if (aircraftCount > 0) return;
        if (localStorage.getItem(DISMISSED_KEY)) return;
        if (window.matchMedia('(display-mode: standalone)').matches) return;
        setShow(true);
    }, [aircraftCount]);

    function dismiss() {
        localStorage.setItem(DISMISSED_KEY, '1');
        setShow(false);
    }

    async function handleDownload() {
        setDownloading(true);
        try {
            const res = await fetch('/api/onboarding/template');
            if (!res.ok) throw new Error('Error descargando la plantilla');
            const blob   = await res.blob();
            const url    = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href     = url;
            anchor.download = `Bitafly-Onboarding-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
        } catch {
            // Si falla, redirigir a Ajustes donde también está el botón
            window.location.href = '/dashboard/settings';
        } finally {
            setDownloading(false);
        }
    }

    if (!show) return null;

    return (
        <div className="mx-3 mb-3 rounded-2xl border border-orange-500/30 bg-gradient-to-b from-orange-900/30 to-slate-800/80 p-4 animate-in slide-in-from-top-2 duration-300">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl text-orange-400">rocket_launch</span>
                    <div>
                        <p className="text-xs font-black text-orange-400 uppercase tracking-wide">¡Bienvenido a Bitafly!</p>
                        <p className="text-xs text-slate-300 font-medium">Configura tu organización en minutos</p>
                    </div>
                </div>
                <button onClick={dismiss} className="text-slate-500 hover:text-slate-300 transition-colors p-1 -mr-1 -mt-1" aria-label="Cerrar">
                    <span className="material-symbols-outlined text-base">close</span>
                </button>
            </div>

            {/* Descripción */}
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                Descarga la plantilla Excel, llénala con tu información (flota, pilotos, baterías…) y súbela para configurar todo de una vez.
            </p>

            {/* Botones */}
            <div className="space-y-2">
                <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="w-full flex items-center justify-center gap-2
                        bg-orange-600 hover:bg-orange-500 active:bg-orange-700
                        disabled:opacity-60 disabled:cursor-not-allowed
                        text-white text-xs font-black uppercase tracking-wide
                        rounded-xl py-2.5 transition-colors">
                    {downloading
                        ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                        : <span className="material-symbols-outlined text-sm">download</span>
                    }
                    {downloading ? 'Descargando...' : 'Descargar plantilla .xlsx'}
                </button>

                <Link
                    href="/dashboard/settings"
                    className="w-full flex items-center justify-center gap-2
                        bg-slate-700 hover:bg-slate-600 active:bg-slate-800
                        text-slate-200 text-xs font-semibold
                        rounded-xl py-2 transition-colors">
                    <span className="material-symbols-outlined text-sm">upload_file</span>
                    Ya la tengo → Subir en Ajustes
                </Link>
            </div>

            <p className="text-[10px] text-slate-500 text-center mt-2">
                También disponible siempre en Ajustes → Inicio Rápido
            </p>
        </div>
    );
}
