'use client';
import { useEffect, useState } from 'react';

// Ventana de bienvenida — se muestra UNA sola vez tras aceptar una
// invitación de organización o canjear un acceso gratuito (socio o Master
// sin organización). Ver /api/dashboard/welcome-invite.
export default function WelcomeInviteModal() {
  const [info, setInfo] = useState(null); // { kind, invitedByName, planLabel, expiresAt }
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard/welcome-invite')
      .then(r => r.json())
      .then(d => { if (d?.show) setInfo(d); })
      .catch(() => {});
  }, []);

  if (!info || closing) return null;

  const close = () => {
    setClosing(true);
    fetch('/api/dashboard/welcome-invite', { method: 'POST' }).catch(() => {});
  };

  const expiresLabel = info.expiresAt
    ? new Date(info.expiresAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-[#1A202C] px-8 pt-10 pb-8 text-center relative">
          <button
            onClick={close}
            aria-label="Cerrar"
            className="absolute top-4 right-4 size-8 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
          <div className="size-16 mx-auto rounded-2xl bg-orange-500/20 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-orange-400 text-3xl">celebration</span>
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-orange-400">¡Bienvenido a BitaFly!</p>
          <p className="text-white text-sm font-medium mt-2 leading-relaxed">
            Has sido invitado por <strong className="font-black">{info.invitedByName}</strong>
          </p>
        </div>

        <div className="px-8 py-7 space-y-4">
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5">
            <span className="material-symbols-outlined text-orange-500 text-xl shrink-0">sell</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Tu plan</p>
              <p className="text-sm font-black text-slate-900">{info.planLabel}</p>
            </div>
          </div>

          {expiresLabel && (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5">
              <span className="material-symbols-outlined text-orange-500 text-xl shrink-0">event</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Acceso gratuito hasta</p>
                <p className="text-sm font-black text-slate-900">{expiresLabel}</p>
              </div>
            </div>
          )}

          {!expiresLabel && (
            <p className="text-xs text-slate-500 font-medium text-center px-2">
              Sin vencimiento individual — tu acceso depende del plan de tu organización.
            </p>
          )}

          <button
            onClick={close}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all active:scale-[.99]"
          >
            Empezar a usar BitaFly
          </button>
        </div>
      </div>
    </div>
  );
}
