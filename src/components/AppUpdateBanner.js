"use client";
import { useEffect, useState } from "react";
import { checkForUpdate, downloadAndInstall } from "@/lib/appUpdate";

/**
 * AppUpdateBanner — detecta nuevas versiones del APK y permite
 * actualizar sin salir de la app ni ir a Play Store.
 *
 * Solo se monta en plataformas nativas (Capacitor Android).
 * Se muestra como un banner anclado abajo o como modal bloqueante
 * si force_update === true.
 */
export default function AppUpdateBanner() {
    const [info, setInfo]         = useState(null);   // resultado de checkForUpdate
    const [dismissed, setDismissed] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError]       = useState(null);

    useEffect(() => {
        checkForUpdate().then(result => {
            if (result?.hasUpdate) setInfo(result);
        });
    }, []);

    if (!info || (!info.forceUpdate && dismissed)) return null;

    async function handleInstall() {
        setDownloading(true);
        setError(null);
        try {
            await downloadAndInstall(info.apkUrl, p => setProgress(p));
        } catch {
            setError("Error al descargar. Verifica la conexión e intenta de nuevo.");
            setDownloading(false);
        }
    }

    // Modal bloqueante si es actualización forzada
    if (info.forceUpdate) {
        return (
            <div className="fixed inset-0 z-[9999] bg-[#1A202C]/95 flex items-center justify-center p-4">
                <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
                    <div className="bg-orange-600 px-5 py-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-white text-2xl">system_update</span>
                        <div>
                            <p className="text-white font-black text-sm uppercase tracking-wide">Actualización requerida</p>
                            <p className="text-orange-200 text-xs">Versión {info.versionName}</p>
                        </div>
                    </div>
                    <div className="px-5 py-4 space-y-3">
                        {info.releaseNotes && (
                            <p className="text-sm text-slate-600 leading-relaxed">{info.releaseNotes}</p>
                        )}
                        <p className="text-xs text-slate-400">
                            Esta actualización es obligatoria para continuar usando BitaFly en este dispositivo.
                        </p>
                        {error && (
                            <p className="text-xs text-red-500 font-bold">{error}</p>
                        )}
                        {downloading ? (
                            <ProgressBar progress={progress} />
                        ) : (
                            <button
                                onClick={handleInstall}
                                className="w-full py-3 bg-orange-600 text-white font-black text-sm uppercase tracking-widest rounded-xl active:scale-95 transition-all"
                            >
                                Actualizar ahora
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Banner no bloqueante
    return (
        <div className="fixed bottom-16 md:bottom-14 lg:bottom-0 left-0 right-0 z-[190] px-3 pb-2 pointer-events-none">
            <div className="pointer-events-auto max-w-lg mx-auto bg-[#1A202C] rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                    <span className="material-symbols-outlined text-orange-500 text-xl shrink-0">system_update</span>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-black leading-none">
                            Nueva versión disponible — {info.versionName}
                        </p>
                        {info.releaseNotes && (
                            <p className="text-slate-400 text-[10px] mt-0.5 truncate">{info.releaseNotes}</p>
                        )}
                    </div>
                    {!downloading && (
                        <>
                            <button
                                onClick={handleInstall}
                                className="shrink-0 px-3 py-1.5 bg-orange-600 text-white text-xs font-black uppercase tracking-wide rounded-xl active:scale-95 transition-all"
                            >
                                Actualizar
                            </button>
                            <button
                                onClick={() => setDismissed(true)}
                                className="shrink-0 size-7 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
                                aria-label="Cerrar"
                            >
                                <span className="material-symbols-outlined text-base">close</span>
                            </button>
                        </>
                    )}
                </div>
                {downloading && (
                    <div className="px-4 pb-3">
                        <ProgressBar progress={progress} />
                        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}

function ProgressBar({ progress }) {
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>Descargando actualización…</span>
                <span>{progress}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-200"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}
