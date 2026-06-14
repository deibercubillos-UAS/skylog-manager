'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Layout del panel de socios (escuelas / asesores).
// Guard client-side: si el usuario no es socio, redirige al dashboard.
export default function SocioLayout({ children }) {
  const [state, setState] = useState('loading'); // loading | ok | denied
  const [ctx, setCtx] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/socio/me')
      .then(async r => {
        if (r.status === 401) { router.replace('/login'); return null; }
        if (!r.ok) { setState('denied'); return null; }
        return r.json();
      })
      .then(data => { if (data) { setCtx(data); setState('ok'); } })
      .catch(() => setState('denied'));
  }, [router]);

  if (state === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Cargando panel...</div>;
  }
  if (state === 'denied') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="material-symbols-outlined text-5xl text-slate-300">lock</span>
        <p className="text-sm font-black uppercase tracking-widest text-slate-500">Acceso solo para socios</p>
        <a href="/dashboard" className="px-5 py-3 bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest">Ir al panel principal</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {ctx?.partner?.logo_url
              ? <img src={ctx.partner.logo_url} alt={ctx.partner.name} className="h-9 w-9 rounded-lg object-contain bg-slate-50 border border-slate-100" />
              : <span className="material-symbols-outlined text-orange-600">handshake</span>}
            <div>
              <p className="text-sm font-black text-slate-900 leading-tight">{ctx?.partner?.name}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {ctx?.partner?.type} · {ctx?.member?.role === 'owner' ? 'Administrador' : 'Asesor'}
              </p>
            </div>
          </div>
          <a href="/dashboard" className="text-xs font-bold text-slate-400 hover:text-slate-600">Salir del panel</a>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-5 py-8">{children}</main>
    </div>
  );
}
