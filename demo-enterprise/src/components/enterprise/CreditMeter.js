'use client';

import { useDemo } from '@/lib/demoStore';
import { fmtNum, fmtCOP, fmtDate } from '@/lib/format';
import Icon from '@/components/Icon';

export default function CreditMeter({ onRecharge }) {
  const { credits, consumedThisCycle, alertThreshold, blocked, pricePerFlight } = useDemo();
  const pct = Math.max(0, Math.min(100, Math.round((credits.balance / credits.monthlyPack) * 100)));

  const tone = blocked ? 'danger' : alertThreshold ? 'warn' : 'ok';
  const barColor = tone === 'danger' ? '#dc2626' : tone === 'warn' ? '#d97706' : 'var(--brand-accent)';
  const valueColor = tone === 'danger' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : '';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Créditos disponibles</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-4xl font-black ${valueColor}`} style={!valueColor ? { color: 'var(--brand-navy)' } : {}}>
              {fmtNum(credits.balance)}
            </span>
            <span className="text-sm text-slate-400 font-bold">/ {fmtNum(credits.monthlyPack)}</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">≈ {fmtCOP(credits.balance * pricePerFlight)} en saldo</p>
        </div>
        <button
          onClick={onRecharge}
          className="flex items-center gap-1.5 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider"
          style={{ backgroundColor: 'var(--brand-accent)' }}
        >
          <Icon name="bolt" className="text-base" /> Recargar
        </button>
      </div>

      {/* Barra de progreso */}
      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>

      <div className="flex items-center justify-between mt-3 text-xs">
        <span className="text-slate-500">
          <strong className="text-slate-700">{fmtNum(consumedThisCycle)}</strong> vuelos cargados este ciclo
        </span>
        <span className="text-slate-400">Renueva: {fmtDate(credits.cycleExpiresAt)}</span>
      </div>

      {blocked && (
        <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <Icon name="block" className="text-red-500 text-lg" />
          <p className="text-xs font-bold text-red-700">
            Saldo agotado — tus pilotos no pueden cargar vuelos hasta recargar (rechazo duro).
          </p>
        </div>
      )}
      {!blocked && alertThreshold && (
        <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Icon name="warning" className="text-amber-500 text-lg" />
          <p className="text-xs font-bold text-amber-700">
            Saldo bajo — quedan {fmtNum(credits.balance)} créditos. Recarga pronto para no interrumpir operaciones.
          </p>
        </div>
      )}
    </div>
  );
}
