'use client';

// Tira de estado del demo — verifica que el store funciona y da controles de
// presentación. Reutilizable; en D3/D4 se integrará al dashboard.

import { useDemo } from '@/lib/demoStore';
import { fmtNum, fmtCOP } from '@/lib/format';

export default function DemoStatus() {
  const {
    hydrated, credits, pilots, missions, flights,
    consumedThisCycle, alertThreshold, blocked,
    pricePerFlight, resetDemo,
  } = useDemo();

  if (!hydrated) {
    return <div className="text-xs text-slate-400 text-center py-2">Cargando estado…</div>;
  }

  const activos = pilots.filter((p) => p.status === 'activo').length;

  return (
    <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Estado del demo</p>
        <button
          onClick={resetDemo}
          className="text-xs font-bold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">restart_alt</span> Reiniciar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Saldo créditos" value={fmtNum(credits.balance)}
              hint={fmtCOP(credits.balance * pricePerFlight)}
              danger={blocked} warn={!blocked && !!alertThreshold} />
        <Stat label="Consumido (ciclo)" value={fmtNum(consumedThisCycle)} hint={`de ${fmtNum(credits.monthlyPack)}`} />
        <Stat label="Pilotos activos" value={`${activos}/${pilots.length}`} hint="vinculados" />
        <Stat label="Misiones · Vuelos" value={`${missions.length} · ${flights.length}`} hint="registrados" />
      </div>

      {blocked && (
        <p className="mt-3 text-xs font-bold text-red-600">
          ⛔ Saldo en 0 — la carga de vuelos está bloqueada (rechazo duro).
        </p>
      )}
      {!blocked && alertThreshold && (
        <p className="mt-3 text-xs font-bold text-amber-600">
          ⚠️ Saldo bajo — quedan {fmtNum(credits.balance)} créditos (alerta de {alertThreshold}).
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, hint, danger, warn }) {
  const color = danger ? 'text-red-600' : warn ? 'text-amber-600' : 'text-slate-900';
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-xl font-black mt-1 ${color}`}>{value}</p>
      {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}
