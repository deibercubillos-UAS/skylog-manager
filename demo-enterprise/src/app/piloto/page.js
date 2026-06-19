'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DEMO } from '@/demo.config';
import { useDemo } from '@/lib/demoStore';
import Icon from '@/components/Icon';
import InvitationCard from '@/components/pilot/InvitationCard';
import SponsoredDashboard from '@/components/pilot/SponsoredDashboard';

export default function PilotoPage() {
  const { hydrated, pilots } = useDemo();
  // Por defecto, abrir como el piloto con invitación pendiente (muestra el flujo completo).
  const [selectedId, setSelectedId] = useState(null);

  if (!hydrated) {
    return <div className="p-10 text-center text-slate-400">Cargando…</div>;
  }

  const pendiente = pilots.find((p) => p.status === 'pendiente');
  const current = pilots.find((p) => p.id === selectedId) || pendiente || pilots[0];

  return (
    <div className="min-h-[calc(100vh-30px)]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 md:px-6 h-16 flex items-center gap-3">
          <Link href="/" className="size-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 shrink-0">
            <Icon name="arrow_back" className="text-lg" />
          </Link>
          <div className="size-9 rounded-xl flex items-center justify-center shrink-0"
               style={{ backgroundColor: 'color-mix(in srgb, var(--brand-accent) 14%, white)' }}>
            <Icon name="person_pin_circle" className="text-xl" style={{ color: 'var(--brand-accent)' }} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Vista Piloto</p>
            <h1 className="text-sm font-black uppercase tracking-tight truncate" style={{ color: 'var(--brand-navy)' }}>
              {current?.name || '—'}
            </h1>
          </div>

          {/* Selector de piloto (solo demo) */}
          <div className="ml-auto flex items-center gap-1.5 bg-slate-50 rounded-xl px-2.5 py-1.5 shrink-0">
            <Icon name="switch_account" className="text-sm text-slate-400" />
            <select
              value={current?.id || ''}
              onChange={(e) => setSelectedId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer max-w-[120px]"
            >
              {pilots.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        {!current ? (
          <p className="text-center text-slate-400 py-10">No hay pilotos.</p>
        ) : current.status === 'pendiente' ? (
          <InvitationCard pilot={current} />
        ) : current.status === 'revocado' ? (
          <RevokedState pilot={current} />
        ) : (
          <SponsoredDashboard pilot={current} />
        )}
      </main>
    </div>
  );
}

function RevokedState() {
  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center">
      <div className="size-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <Icon name="lock" className="text-3xl text-slate-400" />
      </div>
      <h2 className="text-lg font-black mb-2" style={{ color: 'var(--brand-navy)' }}>
        Vínculo revocado — solo lectura
      </h2>
      <p className="text-sm text-slate-500 leading-relaxed mb-2">
        La organización desvinculó tu cuenta. Puedes ver tu información, pero no cargar
        nuevos vuelos. La organización conserva los vuelos que ya compartiste.
      </p>
      <p className="text-xs text-slate-400">
        Para seguir operando, activa el plan Piloto Independiente. Tu cuenta se conserva
        3 meses; luego podría eliminarse.
      </p>
      <button
        className="mt-5 px-5 py-3 rounded-xl text-sm font-black text-white"
        style={{ backgroundColor: 'var(--brand-accent)' }}
      >
        Activar plan Piloto Independiente
      </button>
      <p className="text-[11px] text-amber-600 mt-3">Simulación — sin cobro real.</p>
    </div>
  );
}
