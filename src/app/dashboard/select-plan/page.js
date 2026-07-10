'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { fmtCOP } from '@/lib/formatters';
import { useRouter } from 'next/navigation';

const FALLBACK_PRICES = {
  piloto:      { monthly: { amount: 20000, trialDays: 15 }, annual: { amount: 200000, trialDays: 30 } },
  escuadrilla: { monthly: { amount: 59000 },  annual: { amount: 590000 } },
  flota:       { monthly: { amount: 159000 }, annual: { amount: 1590000 } },
};

const PLANS = [
  {
    key: 'piloto',
    name: 'Piloto',
    tagline: 'Para el piloto autónomo',
    cta: 'Comenzar gratis',
    features: [
      '1 aeronave registrada',
      '1 usuario piloto',
      'Bitácora digital RAC 100 ilimitada',
      'Gestión de baterías (hasta 3)',
      'Alertas de mantenimiento básicas',
      'Reporte PDF Maestro de Vuelo',
      '10 replays GPS · 30 días de historial',
    ],
    missing: ['Autorizaciones F-OPS-001', 'SMS aeronáutico', 'Multi-usuario', 'Análisis SORA'],
  },
  {
    key: 'escuadrilla',
    name: 'Escuadrilla',
    tagline: 'Para pequeñas empresas',
    popular: true,
    cta: 'Comenzar ahora',
    features: [
      'Hasta 3 aeronaves',
      'Hasta 4 usuarios (3 roles)',
      'Bitácora digital RAC 100 ilimitada',
      'Autorizaciones de vuelo F-OPS-001',
      'SMS — registro de incidentes',
      'Reportes PDF: Maestro + Baterías',
      'Baterías ilimitadas',
      '50 replays GPS · 90 días de historial',
    ],
    missing: ['Auditoría completa', 'SORA avanzado', 'Checklists personalizados'],
  },
  {
    key: 'flota',
    name: 'Flota',
    tagline: 'Para empresas medianas',
    dark: true,
    cta: 'Comenzar ahora',
    features: [
      'Hasta 10 aeronaves',
      'Hasta 10 usuarios (5 roles)',
      'Bitácora digital RAC 100 ilimitada',
      'Autorizaciones F-OPS-001 + historial',
      'SMS completo con trazabilidad',
      'Todos los reportes RAC 100',
      'Análisis SORA/ARC/SAIL asistido',
      'Auditoría y trazabilidad completa',
      'Checklists personalizables',
      '200 replays GPS · 6 meses de historial',
    ],
    missing: [],
  },
];

const FAQ = [
  {
    q: '¿Puedo cambiar de plan más adelante?',
    a: 'Sí, en cualquier momento desde Ajustes → Suscripción. El cambio es inmediato y sin penalizaciones.',
  },
  {
    q: '¿Qué pasa con mis datos si cancelo?',
    a: 'Tus datos permanecen en la plataforma por 90 días después de cancelar. Puedes exportar todo en PDF/Excel antes.',
  },
  {
    q: '¿Emiten factura electrónica en Colombia?',
    a: 'Sí. ePayco genera la factura electrónica automáticamente con tu NIT o cédula.',
  },
];



export default function SelectPlanPage() {
  const router = useRouter();
  const [annual, setAnnual] = useState(false);
  const [prices, setPrices] = useState(null);
  const [loading, setLoading] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/plans/public')
      .then(r => { if (!r.ok) { console.warn('[fetch] /api/plans/public failed:', r.status); return null; } return r.json(); })
      .then(data => { if (data && !data.error) setPrices(data); })
      .catch(() => {});
  }, []);

  const getPrice = (planKey) => {
    const pd = prices?.[planKey] ?? FALLBACK_PRICES[planKey];
    return annual
      ? (pd?.annual?.amount ?? 0) / 12
      : (pd?.monthly?.amount ?? 0);
  };

  const getAnnualTotal = (planKey) => {
    const pd = prices?.[planKey] ?? FALLBACK_PRICES[planKey];
    return pd?.annual?.amount ?? 0;
  };

  const getTrialDays = (planKey) => {
    const pd = prices?.[planKey] ?? FALLBACK_PRICES[planKey];
    return (annual ? pd?.annual?.trialDays : pd?.monthly?.trialDays) ?? null;
  };

  const handleSelect = async (planKey) => {
    setLoading(planKey);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      if (planKey === 'piloto') {
        const { error: dbErr } = await supabase
          .from('profiles')
          .update({ subscription_plan: 'piloto' })
          .eq('id', user.id);
        if (dbErr) throw new Error(dbErr.message);
        router.push('/dashboard');
      } else {
        router.push(`/dashboard/subscription?plan=${planKey}&billing=${annual ? 'annual' : 'monthly'}`);
      }
    } catch (err) {
      setError('Error al continuar: ' + err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f6f6] flex flex-col items-center justify-start p-6 pt-12 pb-20 font-display text-left">
      <div className="max-w-5xl w-full space-y-10">

        {/* Header */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-1.5 mb-2">
            <span className="material-symbols-outlined text-[#ec5b13] text-sm">flight</span>
            <span className="text-xs font-black uppercase tracking-widest text-[#ec5b13]">Bitafly</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-[#1A202C] uppercase tracking-tighter">
            Elige tu plan de operaciones
          </h1>
          <p className="text-slate-500 text-sm max-w-xl mx-auto">
            Empieza gratis. Sube de plan cuando necesites más aeronaves, usuarios o el SMS empresarial.
          </p>

          {/* Toggle mensual / anual */}
          <div className="inline-flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm mt-2">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!annual ? 'bg-[#1A202C] text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Mensual
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${annual ? 'bg-[#1A202C] text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Anual
              <span className="bg-[#ec5b13] text-white text-[10px] px-2 py-0.5 rounded-full font-black">-20%</span>
            </button>
          </div>
        </header>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map(plan => {
            const monthlyPrice = getPrice(plan.key);
            const annualTotal  = getAnnualTotal(plan.key);
            const trialDays    = getTrialDays(plan.key);
            const isLoading    = loading === plan.key;

            return (
              <article
                key={plan.key}
                className={`relative flex flex-col rounded-[2rem] border p-8 transition-all ${
                  plan.dark
                    ? 'bg-[#1A202C] text-white border-[#ec5b13] shadow-2xl shadow-slate-900/20 md:scale-105'
                    : plan.popular
                    ? 'bg-white border-[#ec5b13]/60 shadow-xl'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-lg'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#ec5b13] text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-lg whitespace-nowrap">
                    Más popular
                  </div>
                )}
                {plan.dark && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#ec5b13] text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-lg whitespace-nowrap">
                    Para flotas grandes
                  </div>
                )}

                {/* Nombre */}
                <p className={`text-xs font-black uppercase tracking-widest mb-1 ${plan.dark || plan.popular ? 'text-[#ec5b13]' : 'text-slate-400'}`}>
                  {plan.name}
                </p>
                <p className={`text-xs mb-5 ${plan.dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {plan.tagline}
                </p>

                {/* Precio */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-black ${plan.dark ? 'text-white' : 'text-[#1A202C]'}`}>
                      {fmtCOP(monthlyPrice, { free: true })}
                    </span>
                    <span className="text-xs font-bold text-slate-400">/mes</span>
                  </div>
                  {annual && annualTotal > 0 && (
                    <p className="text-xs font-bold text-slate-400 mt-1">
                      Facturado {fmtCOP(annualTotal, { free: true })}/año
                    </p>
                  )}
                  {trialDays > 0 && (
                    <p className={`text-xs font-bold mt-1 ${plan.dark ? 'text-slate-400' : 'text-slate-500'}`}>
                      🎁 {trialDays} días gratis al iniciar
                    </p>
                  )}
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleSelect(plan.key)}
                  disabled={!!loading}
                  aria-label={`Seleccionar ${plan.name}`}
                  className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all mb-8 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 ${
                    plan.dark
                      ? 'bg-[#ec5b13] text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20'
                      : plan.popular
                      ? 'bg-[#ec5b13] text-white hover:bg-orange-600 shadow-md'
                      : 'bg-[#1A202C] text-white hover:bg-slate-800'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Configurando...
                    </>
                  ) : plan.cta}
                </button>

                {/* Features */}
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className={`flex items-start gap-2.5 text-xs ${plan.dark ? 'text-slate-300' : 'text-slate-600'}`}>
                      <span className="material-symbols-outlined text-[#ec5b13] text-base shrink-0 mt-0.5" aria-hidden="true">check_circle</span>
                      {f}
                    </li>
                  ))}
                  {plan.missing.map(f => (
                    <li key={f} className={`flex items-start gap-2.5 text-xs ${plan.dark ? 'text-slate-600' : 'text-slate-300'}`}>
                      <span className="material-symbols-outlined text-slate-300 text-base shrink-0 mt-0.5" aria-hidden="true">remove_circle</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        {/* Error global */}
        {error && (
          <div role="alert" className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700 font-bold">
            <span className="material-symbols-outlined text-red-500 text-base shrink-0" aria-hidden="true">error</span>
            {error}
          </div>
        )}

        {/* Tabla comparativa rápida */}
        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
          <div className="px-8 py-5 border-b border-slate-100">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ec5b13]">Comparativa</p>
            <h2 className="text-lg font-black text-[#1A202C] uppercase tracking-tight mt-0.5">¿Qué incluye cada plan?</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" role="table" aria-label="Comparativa de planes">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-widest">
                  <th className="text-left px-8 py-3">Función</th>
                  <th className="text-center px-4 py-3">Piloto</th>
                  <th className="text-center px-4 py-3 text-[#ec5b13]">Escuadrilla</th>
                  <th className="text-center px-4 py-3">Flota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  ['Aeronaves',          '1',        '3',         '15'],
                  ['Usuarios',           '1',        '4',         '15'],
                  ['Bitácora RAC 100',   '✅',       '✅',        '✅'],
                  ['Autorizaciones',     '—',        '✅',        '✅'],
                  ['SMS aeronáutico',    '—',        'Básico',    '✅ Completo'],
                  ['Análisis SORA',      '—',        '—',         '✅'],
                  ['Replay GPS',         '10 vuelos','50 vuelos', '200 vuelos'],
                  ['Reportes PDF/Excel', 'Maestro',  '+ Baterías','Todos RAC 100'],
                ].map(([feat, p, e, f]) => (
                  <tr key={feat} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-3 font-bold text-slate-700">{feat}</td>
                    <td className="px-4 py-3 text-center text-slate-400">{p}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700">{e}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700">{f}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 px-1">Preguntas frecuentes</p>
          {FAQ.map((item, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm font-black text-slate-800">{item.q}</span>
                <span className={`material-symbols-outlined text-slate-400 text-base transition-transform duration-200 shrink-0 ml-4 ${openFaq === i ? 'rotate-180' : ''}`} aria-hidden="true">
                  expand_more
                </span>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5 text-sm text-slate-500 font-medium leading-relaxed border-t border-slate-50 pt-4">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Banner AeroCivil */}
        <div className="bg-white border border-[#ec5b13]/20 rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-6 shadow-sm">
          <div className="size-12 bg-orange-50 rounded-2xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#ec5b13] text-2xl" aria-hidden="true">verified_user</span>
          </div>
          <div className="flex-1 text-center md:text-left">
            <p className="text-xs font-black uppercase tracking-widest text-[#ec5b13] mb-1">Fase 0 · Certificación AeroCivil</p>
            <p className="text-sm font-bold text-[#1A202C]">
              ¿Tu empresa está en Fase 0 de certificación como Explotador UAS? Accede al plan Escuadrilla de Bitafly sin costo durante esa etapa, hasta un máximo de 6 meses.
            </p>
          </div>
          <a
            href="mailto:hola@bitafly.com?subject=Acceso Fase 0 certificación AeroCivil"
            className="shrink-0 bg-[#ec5b13] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-md text-center"
          >
            Solicitar acceso
          </a>
        </div>

      </div>
    </div>
  );
}
