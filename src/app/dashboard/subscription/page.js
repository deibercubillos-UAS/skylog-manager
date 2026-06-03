'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import EpaycoCheckout from '@/components/EpaycoCheckout';
import ConfirmModal from '@/components/ui/ConfirmModal';

// Fallback estático en COP (se sobreescribe con datos de la BD)
const UPGRADE_PLANS_BASE = [
  { key: 'piloto',       name: 'Piloto',       monthlyAmount: 15000,   annualAmount: 150000,   trialDays: 60,   limits: '1 drone · 1 usuario',    popular: false },
  { key: 'escuadrilla',  name: 'Escuadrilla',  monthlyAmount: 59000,   annualAmount: 590000,   trialDays: null, limits: '3 drones · 4 usuarios',   popular: false },
  { key: 'flota',        name: 'Flota',        monthlyAmount: 159000,  annualAmount: 1590000,  trialDays: null, limits: '15 drones · 15 usuarios',  popular: true  },
];

function fmtCOP(n) {
  return '$' + Math.round(n).toLocaleString('es-CO');
}

export default function SubscriptionPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [billing, setBilling] = useState('monthly');
  const [cancelling,   setCancelling]   = useState(false);
  const [showCancelDlg, setShowCancelDlg] = useState(false);
  const [planPrices, setPlanPrices] = useState(null);

  useEffect(() => {
    fetch('/api/plans/public')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setPlanPrices(d); })
      .catch(() => {});
  }, []);

  const UPGRADE_PLANS = UPGRADE_PLANS_BASE.map(p => {
    const pd = planPrices?.[p.key];
    if (!pd) return p;
    return {
      ...p,
      monthlyAmount: pd.monthly?.amount  ?? p.monthlyAmount,
      annualAmount:  pd.annual?.amount   ?? p.annualAmount,
      trialDays:     pd.monthly?.trialDays ?? pd.annual?.trialDays ?? p.trialDays,
    };
  });

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { window.location.href = '/login'; return; }
        const res = await fetch('/api/subscription', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        setData(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();

    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'result') {
      window.history.replaceState({}, '', '/dashboard/subscription');
    }
  }, []);

  const handleCancel = () => setShowCancelDlg(true);

  const doCancel = async () => {
    setShowCancelDlg(false);
    setCancelling(true);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch('/api/subscription/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: session.user.id }),
    });
    window.location.reload();
  };

  if (loading) return (
    <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">
      Cargando suscripción...
    </div>
  );

  if (error || !data) return (
    <div className="p-20 text-center text-red-500 font-bold uppercase">
      Error al cargar suscripción.
      <button onClick={() => window.location.reload()} className="block mx-auto mt-4 bg-primary text-white px-6 py-2 rounded-xl text-xs font-black">
        Reintentar
      </button>
    </div>
  );

  const isPaid = ['escuadrilla', 'flota', 'enterprise'].includes(data.planSlug) ||
    (data.planSlug === 'piloto' && data.expiresAt);

  return (
    <>
    <ConfirmModal
      isOpen={showCancelDlg}
      title="¿Cancelar suscripción?"
      message="Volverás al plan Piloto de inmediato. Perderás acceso a las funciones de tu plan actual."
      confirmText="Cancelar suscripción"
      danger
      onConfirm={doCancel}
      onCancel={() => setShowCancelDlg(false)}
    />
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Suscripción</h2>
        <p className="text-slate-500 text-sm mt-1 font-medium">Administra tu plan y activos de Bitafly.</p>
      </header>

      {/* Plan actual */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#1A202C] text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between h-72">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 blur-3xl rounded-full" />
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">Plan actual</p>
            <h3 className="text-4xl font-black uppercase tracking-tight">{data.planName}</h3>
            {data.expiresAt && (
              <p className="text-xs text-slate-400 font-bold mt-2">
                Vigente hasta: {new Date(data.expiresAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>
          {isPaid && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="relative z-10 w-full py-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500/30 hover:border-red-500 hover:text-red-300 transition-all disabled:opacity-50"
            >
              {cancelling ? 'Cancelando...' : '✕ Cancelar suscripción'}
            </button>
          )}
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm space-y-8">
          <Meter label="Drones registrados" current={data.usage.drones.current} limit={data.usage.drones.limit} />
          <Meter label="Pilotos activos" current={data.usage.pilots.current} limit={data.usage.pilots.limit} />
        </div>
      </div>

      {/* Planes de upgrade (solo si no es enterprise) */}
      {data.planSlug !== 'enterprise' && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-navy uppercase tracking-tight">Mejorar plan</h3>
            {/* Toggle billing */}
            <div className="inline-flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              {['monthly', 'annual'].map((b) => (
                <button key={b} onClick={() => setBilling(b)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${billing === b ? 'bg-white shadow text-navy' : 'text-slate-400'}`}>
                  {b === 'monthly' ? 'Mensual' : 'Anual −20%'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {UPGRADE_PLANS.filter(p => {
              // Ocultar planes iguales o inferiores al actual
              const order = ['piloto', 'escuadrilla', 'flota', 'enterprise'];
              return order.indexOf(p.key) > order.indexOf(data.planSlug);
            }).map((plan) => (
              <div key={plan.key}
                className={`relative bg-white border-2 rounded-[2rem] p-8 flex flex-col gap-4 ${plan.popular ? 'border-primary shadow-xl shadow-orange-500/10' : 'border-slate-200'}`}>
                {plan.popular && (
                  <span className="absolute -top-3 left-6 bg-primary text-white text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full">
                    Recomendado
                  </span>
                )}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">{plan.name}</p>
                  <p className="text-3xl font-black text-navy mt-1">
                    {billing === 'annual'
                      ? `${fmtCOP(plan.annualAmount / 12)}/mes`
                      : `${fmtCOP(plan.monthlyAmount)}/mes`}
                  </p>
                  {billing === 'annual' && plan.annualAmount && (
                    <p className="text-xs text-emerald-600 font-black mt-1">
                      ✓ Facturado {fmtCOP(plan.annualAmount)}/año
                    </p>
                  )}
                  {plan.trialDays && (
                    <p className="text-xs text-primary font-bold mt-1">
                      🎁 {Math.round(plan.trialDays / 30)} meses gratis al suscribirte
                    </p>
                  )}
                  <p className="text-xs font-black text-primary uppercase mt-2">{plan.limits}</p>
                </div>
                <EpaycoCheckout
                  planKey={plan.key}
                  billing={billing}
                  label={`Activar ${plan.name}`}
                  className={plan.popular
                    ? 'bg-primary text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20'
                    : 'bg-navy text-white hover:bg-slate-800'}
                />
              </div>
            ))}

            {/* Enterprise card */}
            <div className="bg-[#1A202C] border-2 border-white/10 rounded-[2rem] p-8 flex flex-col gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-primary">Enterprise</p>
                <p className="text-3xl font-black text-white mt-1">A consultar</p>
                <p className="text-xs text-slate-400 font-bold">Ilimitado · White label · API · SLA</p>
              </div>
              <a href="/#contacto"
                className="w-full text-center py-3.5 rounded-2xl border border-white/20 text-white font-black text-xs uppercase tracking-widest hover:bg-white/5 transition-all">
                Contactar ventas
              </a>
            </div>
          </div>
        </section>
      )}
    </div>
    </>
  );
}

function Meter({ label, current, limit }) {
  const isUnlimited = limit >= 999;
  const pct   = isUnlimited ? 0 : Math.min((current / Math.max(limit, 1)) * 100, 100);
  const color = (!isUnlimited && pct >= 90) ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : 'bg-primary';

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-black uppercase text-slate-600">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-black text-slate-900">{current}</span>
          <span className="text-sm text-slate-400 font-bold">/</span>
          {isUnlimited ? (
            <span className="text-xl font-black text-emerald-500 leading-none">∞</span>
          ) : (
            <span className="text-sm font-black text-slate-900">{limit}</span>
          )}
        </div>
      </div>
      {isUnlimited ? (
        <div className="w-full h-3 bg-emerald-100 rounded-full overflow-hidden flex items-center justify-center">
          <div className="w-full h-full bg-emerald-400/30 rounded-full" />
        </div>
      ) : (
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
