'use client';

import { useState } from 'react';
import { useDemo } from '@/lib/demoStore';
import { fmtNum, fmtCOP } from '@/lib/format';
import { CREDIT_PACKS } from '@/lib/mockData';
import Icon from '@/components/Icon';

export default function RechargeModal({ open, onClose }) {
  const { recharge, pricePerFlight } = useDemo();
  const [pack, setPack] = useState(CREDIT_PACKS[0]);

  if (!open) return null;

  const confirm = () => {
    recharge(pack);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <Icon name="bolt" className="text-xl" style={{ color: 'var(--brand-accent)' }} />
          <h2 className="text-lg font-black" style={{ color: 'var(--brand-navy)' }}>Recargar créditos</h2>
        </div>
        <p className="text-sm text-slate-500 mb-5">
          Paquete mensual prepago. Mínimo 500 créditos · {fmtCOP(pricePerFlight)} por vuelo.
          Los créditos se renuevan y vencen cada mes.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {CREDIT_PACKS.map((p) => {
            const active = pack === p;
            return (
              <button
                key={p}
                onClick={() => setPack(p)}
                className={`rounded-xl border-2 p-4 text-left transition-all ${active ? 'border-[var(--brand-accent)] bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <p className="text-xl font-black" style={{ color: 'var(--brand-navy)' }}>{fmtNum(p)}</p>
                <p className="text-[11px] text-slate-400">créditos</p>
                <p className="text-xs font-bold mt-1" style={{ color: 'var(--brand-accent)' }}>{fmtCOP(p * pricePerFlight)}</p>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={confirm} className="flex-1 py-3 rounded-xl text-sm font-black text-white" style={{ backgroundColor: 'var(--brand-accent)' }}>
            Recargar {fmtNum(pack)}
          </button>
        </div>

        <p className="text-[11px] text-amber-600 text-center mt-3">Simulación — no se realiza ningún cobro real.</p>
      </div>
    </div>
  );
}
