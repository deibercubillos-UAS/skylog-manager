'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { trackEvent } from '@/lib/analytics';

// Precios estáticos de respaldo (COP). Se sobreescriben con datos de la BD.
const PLANS_BASE = [
  {
    key: 'piloto',
    name: 'Piloto',
    badge: null,
    tagline: 'Para el piloto autónomo',
    monthlyAmount: 20000,
    annualAmount:  200000,
    trialDays:     30,
    dark: false,
    popular: false,
    cta: 'Comenzar gratis',
    href: '/registro',
    limits: '1 aeronave · 1 usuario',
    features: [
      '1 aeronave registrada',
      '1 usuario (piloto)',
      'Bitácora digital RAC 100 ilimitada',
      'Alertas de mantenimiento básicas',
      'Gestión de hasta 3 baterías',
      'Reporte PDF Maestro de Vuelo',
      'Soporte por correo (48h)',
    ],
    missing: ['Autorizaciones F-OPS-001', 'SMS aeronáutico', 'Multi-usuario'],
  },
  {
    key: 'escuadrilla',
    name: 'Escuadrilla',
    badge: null,
    tagline: 'Para pequeñas empresas',
    monthlyAmount: 59000,
    annualAmount:  590000,
    trialDays:     null,
    dark: false,
    popular: false,
    cta: 'Comenzar ahora',
    href: '/registro',
    limits: '3 aeronaves · 4 usuarios',
    features: [
      'Hasta 3 aeronaves',
      'Hasta 4 usuarios (3 roles)',
      'Bitácora digital RAC 100 ilimitada',
      'Mantenimiento con alertas automáticas',
      'Baterías ilimitadas',
      'Autorizaciones de vuelo F-OPS-001',
      'Reportes PDF: Maestro de Vuelo + Baterías',
      'SMS básico (registro de incidentes)',
      'Soporte por correo (24h)',
    ],
    missing: ['Auditoría completa', 'SMS con trazabilidad', 'Checklists personalizados'],
  },
  {
    key: 'flota',
    name: 'Flota',
    badge: 'Más popular',
    tagline: 'Para empresas medianas',
    monthlyAmount: 159000,
    annualAmount:  1590000,
    trialDays:     null,
    dark: true,
    popular: true,
    cta: 'Comenzar ahora',
    href: '/registro',
    limits: '15 aeronaves · 15 usuarios',
    features: [
      'Hasta 15 aeronaves',
      'Hasta 15 usuarios (5 roles)',
      'Bitácora digital RAC 100 ilimitada',
      'Mantenimiento avanzado + historial',
      'Baterías ilimitadas',
      'Autorizaciones F-OPS-001 + historial',
      'Todos los reportes RAC 100 (F-OPS-002, F-MNT-003, F-HUM-005)',
      'SMS completo con trazabilidad de incidentes',
      'Auditoría y trazabilidad completa',
      'Protocolos y checklists personalizables',
      'Soporte prioritario chat + email (12h)',
    ],
    missing: [],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    badge: null,
    tagline: 'Para grandes operadores',
    monthlyAmount: null,
    annualAmount:  null,
    trialDays:     null,
    dark: false,
    popular: false,
    cta: 'Contactar ventas',
    href: '#contacto',
    limits: 'Ilimitado',
    features: [
      'Aeronaves y usuarios ilimitados',
      'Todo el plan Flota incluido',
      'White label / marca propia',
      'API access + integraciones',
      'SLA 99.9% garantizado',
      'Soporte dedicado 24/7',
      'Capacitación presencial o virtual',
      'Onboarding personalizado',
    ],
    missing: [],
  },
];

function fmtCOP(n) {
  return '$' + Math.round(n).toLocaleString('es-CO');
}

function trialText(days) {
  if (!days) return null;
  const m = Math.round(days / 30);
  return m === 1 ? '1 mes' : `${m} meses`;
}

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [prices, setPrices] = useState(null);

  useEffect(() => { trackEvent('view_pricing', {}); }, []);

  useEffect(() => {
    fetch('/api/plans/public')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && !data.error) setPrices(data); })
      .catch(() => {});
  }, []);

  // Genera texto de replay a partir de cuotas del plan
  function replayFeatureText(planKey, pd) {
    const maxFlights    = pd?.monthly?.replayMaxFlights     ?? pd?.annual?.replayMaxFlights;
    const retentionDays = pd?.monthly?.replayRetentionDays  ?? pd?.annual?.replayRetentionDays;
    if (maxFlights == null) return null;
    const flightsTxt = maxFlights === 0    ? 'Replays ilimitados' : `${maxFlights} replays GPS`;
    const daysTxt    = retentionDays === 0 ? 'historial permanente'
                     : retentionDays >= 180 ? `${Math.round(retentionDays / 30)} meses de historial`
                     : retentionDays >= 30  ? `${Math.round(retentionDays / 30)} mes${Math.round(retentionDays / 30) > 1 ? 'es' : ''} de historial`
                     : `${retentionDays} días de historial`;
    return `${flightsTxt} · ${daysTxt}`;
  }

  const PLANS = PLANS_BASE.map(plan => {
    const pd = prices?.[plan.key];
    const replayText = replayFeatureText(plan.key, pd);
    const baseFeatures = [...plan.features];

    // Insertar fila de replay si tenemos datos de la BD
    if (replayText) {
      // Reemplazar si ya existe una fila de replay, o insertar al inicio
      const replayIdx = baseFeatures.findIndex(f => f.toLowerCase().includes('replay'));
      if (replayIdx >= 0) {
        baseFeatures[replayIdx] = replayText;
      } else {
        // Insertar después del primer feature de bitácora (segundo elemento aprox)
        baseFeatures.splice(1, 0, replayText);
      }
    }

    if (!pd) return { ...plan, features: baseFeatures };
    return {
      ...plan,
      monthlyAmount: pd.monthly?.amount    ?? plan.monthlyAmount,
      annualAmount:  pd.annual?.amount     ?? plan.annualAmount,
      trialDays:     pd.monthly?.trialDays ?? pd.annual?.trialDays ?? plan.trialDays,
      features:      baseFeatures,
    };
  });

  return (
    <section id="precios" className="py-24 px-6 bg-[#f8f6f6]">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14 space-y-4">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-primary">Precios</p>
          <h2 className="font-lexend text-3xl md:text-5xl font-black text-navy uppercase tracking-tighter">
            Planes que <span className="text-primary">crecen con tu flota</span>
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Empieza gratis. Actualiza cuando agregues más drones, tripulantes o necesites
            el SMS empresarial. Sin contratos rígidos.
          </p>

          {/* Toggle anual / mensual */}
          <div className="inline-flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm mt-2">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!annual ? 'bg-navy text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Mensual
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${annual ? 'bg-navy text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Anual
              <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full font-black">-20%</span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
          {PLANS.map((plan) => {
            const displayAmount = annual && plan.annualAmount
              ? plan.annualAmount / 12
              : plan.monthlyAmount;

            return (
              <article
                key={plan.key}
                className={`relative flex flex-col rounded-[2rem] border p-8 transition-all duration-300 ${
                  plan.popular
                    ? 'bg-navy text-white border-primary shadow-2xl shadow-navy/20 xl:scale-105 hover:-translate-y-1 hover:shadow-3xl'
                    : 'bg-white border-slate-200 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">
                    {plan.badge}
                  </div>
                )}

                {/* Nombre y tagline */}
                <p className={`font-lexend text-xs font-black uppercase tracking-widest mb-1 ${plan.popular ? 'text-primary' : 'text-slate-400'}`}>
                  {plan.name}
                </p>
                <p className={`text-xs mb-5 ${plan.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                  {plan.tagline}
                </p>

                {/* Precio */}
                <div className="mb-2">
                  {plan.monthlyAmount === null ? (
                    <p className={`text-4xl font-black ${plan.popular ? 'text-white' : 'text-navy'}`}>
                      A consultar
                    </p>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className={`font-lexend text-3xl font-black tabular-nums transition-all duration-300 ${plan.popular ? 'text-white' : 'text-navy'}`}>
                          {fmtCOP(displayAmount)}
                        </span>
                        <span className={`text-xs font-bold ${plan.popular ? 'text-slate-400' : 'text-slate-400'}`}>
                          /mes
                        </span>
                      </div>
                      {annual && plan.annualAmount && (
                        <p className={`text-xs font-bold mt-1 ${plan.popular ? 'text-slate-400' : 'text-slate-400'}`}>
                          Facturado {fmtCOP(plan.annualAmount)}/año
                        </p>
                      )}
                      {plan.trialDays && (
                        <p className={`text-xs font-bold mt-1 ${plan.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                          🎁 {trialText(plan.trialDays)} gratis al iniciar
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Límites */}
                <p className={`text-xs font-black uppercase tracking-wider mb-6 ${plan.popular ? 'text-primary' : 'text-primary'}`}>
                  {plan.limits}
                </p>

                {/* CTA */}
                <Link
                  href={plan.href}
                  className={`text-center py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all mb-8 ${
                    plan.popular
                      ? 'bg-primary text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20'
                      : 'bg-navy text-white hover:bg-slate-800'
                  }`}
                >
                  {plan.cta}
                </Link>

                {/* Features */}
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2.5 text-xs ${plan.popular ? 'text-slate-300' : 'text-slate-600'}`}>
                      <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5">check_circle</span>
                      {f}
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li key={f} className={`flex items-start gap-2.5 text-xs ${plan.popular ? 'text-slate-600' : 'text-slate-300'}`}>
                      <span className="material-symbols-outlined text-slate-300 text-base shrink-0 mt-0.5">remove_circle</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        {/* Banner certificación AeroCivil */}
        <div className="mt-12 bg-white border border-primary/20 rounded-[2rem] p-8 md:p-10 grid md:grid-cols-[1fr_auto] gap-6 items-center shadow-sm">
          <div className="flex items-start gap-5">
            <div className="size-12 bg-orange-50 rounded-2xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-2xl">verified_user</span>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-primary mb-1">
                Oferta especial · Proceso de certificación
              </p>
              <h3 className="text-lg font-black text-navy mb-2">
                ¿Tu empresa está certificando como Explotador UAS ante la AeroCivil?
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                Accede a Bitafly <strong>sin costo</strong> durante todo el proceso de certificación.
                Sabemos que cumplir con la RAC 100 tiene un costo, y queremos ser parte de la solución.
                Contáctanos con tu número de radicado y activamos tu cuenta inmediatamente.
              </p>
            </div>
          </div>
          <a
            href="#contacto"
            className="shrink-0 bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 text-center"
          >
            Solicitar acceso
          </a>
        </div>

      </div>
    </section>
  );
}
