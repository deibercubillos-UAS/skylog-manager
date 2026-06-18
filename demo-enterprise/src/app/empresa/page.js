'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DEMO } from '@/demo.config';
import { useDemo } from '@/lib/demoStore';
import { fmtNum, fmtCOP } from '@/lib/format';
import Icon from '@/components/Icon';
import CreditMeter from '@/components/enterprise/CreditMeter';
import PilotsPanel from '@/components/enterprise/PilotsPanel';
import MissionsPanel from '@/components/enterprise/MissionsPanel';
import FlightsTable from '@/components/enterprise/FlightsTable';
import RechargeModal from '@/components/enterprise/RechargeModal';

export default function EmpresaPage() {
  const {
    hydrated, credits, pilots, flights, consumedThisCycle, blocked, pricePerFlight, setBalance,
  } = useDemo();
  const [recharge, setRecharge] = useState(false);

  if (!hydrated) {
    return <div className="p-10 text-center text-slate-400">Cargando panel…</div>;
  }

  const activos = pilots.filter((p) => p.status === 'activo').length;

  return (
    <div className="min-h-[calc(100vh-30px)]">
      {/* Header white-label */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center gap-3">
          <Link href="/" className="size-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 shrink-0">
            <Icon name="arrow_back" className="text-lg" />
          </Link>
          <div className="size-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--brand-accent) 14%, white)' }}>
            <Icon name="corporate_fare" className="text-xl" style={{ color: 'var(--brand-accent)' }} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Panel Enterprise</p>
            <h1 className="text-sm font-black uppercase tracking-tight truncate" style={{ color: 'var(--brand-navy)' }}>
              {DEMO.clientName}
            </h1>
          </div>
          <span className="ml-auto text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 px-2 py-1 rounded-full shrink-0">
            Demo
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-5">

        {/* Fila superior: medidor + KPIs */}
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <CreditMeter onRecharge={() => setRecharge(true)} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            <Kpi icon="group" label="Pilotos activos" value={`${activos}/${pilots.length}`} />
            <Kpi icon="payments" label="Costo del ciclo" value={fmtCOP(consumedThisCycle * pricePerFlight)} />
          </div>
        </div>

        {/* Pilotos + Misiones */}
        <div className="grid lg:grid-cols-2 gap-5">
          <PilotsPanel />
          <MissionsPanel />
        </div>

        {/* Vuelos */}
        <FlightsTable />

        {/* Controles de presentación (solo demo) */}
        <div className="bg-slate-900 rounded-2xl p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
            <Icon name="tune" className="text-sm" /> Controles de presentación (demo)
          </p>
          <div className="flex flex-wrap gap-2">
            <PresenterBtn onClick={() => setBalance(11)} label="Saltar a saldo bajo (11)" />
            <PresenterBtn onClick={() => setBalance(0)} label="Vaciar saldo (0)" />
            <PresenterBtn onClick={() => setRecharge(true)} label="Abrir recarga" />
          </div>
        </div>
      </main>

      {/* Letrero flotante de recarga (saldo 0) */}
      {blocked && (
        <div className="fixed bottom-4 inset-x-4 md:inset-x-auto md:right-6 md:w-96 z-[150] bg-red-600 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3">
          <Icon name="error" className="text-2xl shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black">Sin créditos</p>
            <p className="text-xs text-white/80">Tus pilotos no pueden cargar vuelos. Recarga para continuar.</p>
          </div>
          <button onClick={() => setRecharge(true)} className="bg-white text-red-600 px-3 py-2 rounded-xl text-xs font-black uppercase shrink-0">
            Recargar
          </button>
        </div>
      )}

      <RechargeModal open={recharge} onClose={() => setRecharge(false)} />
    </div>
  );
}

function Kpi({ icon, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
      <div className="size-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--brand-accent) 12%, white)' }}>
        <Icon name={icon} className="text-xl" style={{ color: 'var(--brand-accent)' }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-lg font-black truncate" style={{ color: 'var(--brand-navy)' }}>{value}</p>
      </div>
    </div>
  );
}

function PresenterBtn({ onClick, label }) {
  return (
    <button onClick={onClick} className="text-xs font-bold text-slate-200 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 transition-colors">
      {label}
    </button>
  );
}
