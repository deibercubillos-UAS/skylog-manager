'use client';
// Error boundary para todas las rutas /dashboard/*
// Se activa cuando un componente hijo lanza un error no manejado en el cliente.
import { useEffect } from 'react';

export default function DashboardError({ error, reset }) {
  useEffect(() => {
    // Puedes enviar el error a Sentry u otro servicio aquí
    console.error('[DashboardError]', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 animate-in fade-in duration-500">
      <div className="max-w-md w-full text-center space-y-6">

        {/* Icono */}
        <div className="size-20 bg-orange-50 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm border border-orange-100">
          <span className="material-symbols-outlined text-primary text-4xl">flight_takeoff</span>
        </div>

        {/* Texto */}
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-primary">Error de sistema</p>
          <h2 className="text-2xl font-black text-navy uppercase tracking-tighter">
            Algo salió mal
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Se produjo un error inesperado en esta sección.
            Puedes intentar de nuevo o volver al panel principal.
          </p>
        </div>

        {/* Detalle técnico (solo en dev) */}
        {process.env.NODE_ENV !== 'production' && error?.message && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left">
            <p className="text-xs font-black uppercase text-slate-400 mb-1">Detalle técnico</p>
            <p className="text-xs font-mono text-red-600 break-all">{error.message}</p>
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
          >
            <span className="flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-sm">refresh</span>
              Intentar de nuevo
            </span>
          </button>
          <a
            href="/dashboard"
            className="px-6 py-3 bg-navy text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
          >
            <span className="flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-sm">home</span>
              Volver al panel
            </span>
          </a>
        </div>

      </div>
    </div>
  );
}
