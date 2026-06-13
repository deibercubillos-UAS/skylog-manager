'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';
import { fmtCOP } from '@/lib/formatters';

const faqItems = [
  { q: '¿El plan gratuito requiere tarjeta de crédito?', a: 'No. El plan Piloto es gratuito por 6 meses sin necesidad de tarjeta de crédito. Solo necesitas un correo electrónico para registrarte. Al finalizar los 6 meses, puedes elegir continuar con el plan de pago o contactarnos para extender el período gratuito si estás en proceso de certificación.' },
  { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí. Puedes actualizar o degradar tu plan en cualquier momento desde el panel de suscripción. Los cambios aplican al siguiente período de facturación. Si actualizas, el acceso a las nuevas funciones es inmediato.' },
  { q: '¿Hay descuento por pago anual?', a: 'Sí. El pago anual tiene un descuento del 20%. El plan Escuadrilla pasa de $59.000/mes a $49.000/mes (equivalente). El plan Flota pasa de $159.000/mes a $132.500/mes (equivalente). Selecciona "Anual" en el toggle de precios para ver los valores exactos.' },
  { q: '¿Los pagos son en pesos colombianos o dólares?', a: 'Todos los precios son en pesos colombianos (COP). El cobro se realiza a través de ePayco. Aceptamos tarjetas Visa, Mastercard, débito y PSE.' },
  { q: '¿Qué pasa con mis datos si cancelo?', a: 'Tus datos se conservan durante 90 días después de la cancelación, período durante el cual puedes exportar tus bitácoras, reportes y datos de flota en PDF o Excel. Transcurrido ese período, los datos son eliminados de forma permanente.' },
];

const accent = '#ec5b13';
const navy = '#1A202C';

const CHECK = () => (
  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: accent, flexShrink: 0, marginTop: '1px' }}>check_circle</span>
);
const CROSS = () => (
  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#e2e8f0', flexShrink: 0, marginTop: '1px' }}>remove_circle</span>
);

// Precios fallback en COP
const PLANS_BASE = [
  {
    key: 'piloto',     monthlyAmount: 20000,  annualAmount: 200000,  trialDays: 30,
    name: 'Piloto',    sub: 'Para el piloto autónomo',  tag: '1 aeronave · 1 usuario',
    cta: 'Comenzar gratis', ctaHref: '/registro', dark: false,
    features: [
      { ok: true,  text: '1 aeronave registrada' },
      { ok: true,  text: 'Bitácora RAC 100 ilimitada' },
      { ok: true,  text: 'Alertas de mantenimiento' },
      { ok: true,  text: 'Hasta 3 baterías' },
      { ok: true,  text: 'Reporte PDF F-OPS-002' },
      { ok: false, text: 'Autorizaciones F-OPS-001' },
      { ok: false, text: 'SMS aeronáutico' },
      { ok: false, text: 'Multi-usuario' },
    ],
  },
  {
    key: 'escuadrilla', monthlyAmount: 59000, annualAmount: 590000,  trialDays: null,
    name: 'Escuadrilla', sub: 'Para pequeñas empresas', tag: '3 aeronaves · 4 usuarios',
    cta: 'Comenzar ahora', ctaHref: '/registro', dark: false,
    features: [
      { ok: true,  text: 'Hasta 3 aeronaves' },
      { ok: true,  text: 'Hasta 4 usuarios (3 roles)' },
      { ok: true,  text: 'Bitácora RAC 100 ilimitada' },
      { ok: true,  text: 'Baterías ilimitadas' },
      { ok: true,  text: 'Autorizaciones F-OPS-001' },
      { ok: true,  text: 'SMS básico' },
      { ok: false, text: 'Auditoría completa' },
      { ok: false, text: 'Checklists personalizados' },
    ],
  },
  {
    key: 'flota',      monthlyAmount: 159000, annualAmount: 1590000, trialDays: null,
    name: 'Flota',     sub: 'Para empresas medianas', tag: '15 aeronaves · 15 usuarios',
    cta: 'Comenzar ahora', ctaHref: '/registro', dark: true, popular: true,
    features: [
      { ok: true, text: 'Hasta 15 aeronaves' },
      { ok: true, text: '15 usuarios · 5 roles RAC 100' },
      { ok: true, text: 'Todos los reportes: F-OPS-002, F-MNT-003, F-HUM-005' },
      { ok: true, text: 'SMS completo con trazabilidad' },
      { ok: true, text: 'Auditoría y trazabilidad completa' },
      { ok: true, text: 'Checklists personalizables' },
      { ok: true, text: 'Soporte prioritario 12h' },
    ],
  },
  {
    key: 'enterprise', monthlyAmount: null, annualAmount: null, trialDays: null,
    name: 'Enterprise', sub: 'Para grandes operadores', tag: 'Ilimitado',
    cta: 'Contactar ventas', ctaHref: 'mailto:soporte@bitafly.com', dark: false,
    features: [
      { ok: true, text: 'Todo el plan Flota incluido' },
      { ok: true, text: 'Aeronaves y usuarios ilimitados' },
      { ok: true, text: 'White label / marca propia' },
      { ok: true, text: 'API access + integraciones' },
      { ok: true, text: 'SLA 99.9% garantizado' },
      { ok: true, text: 'Soporte dedicado 24/7' },
      { ok: true, text: 'Onboarding personalizado' },
    ],
  },
];

function trialText(days) {
  if (!days) return null;
  const m = Math.round(days / 30);
  return m === 1 ? '1 mes' : `${m} meses`;
}

export default function PreciosClient() {
  const [annual, setAnnual] = useState(false);
  const [prices, setPrices] = useState(null);

  useEffect(() => {
    fetch('/api/plans/public')
      .then(r => { if (!r.ok) { console.warn('[fetch] /api/plans/public failed:', r.status); return null; } return r.json(); })
      .then(data => { if (data && !data.error) setPrices(data); })
      .catch(() => {});
  }, []);

  const plans = PLANS_BASE.map(plan => {
    const pd = prices?.[plan.key];
    if (!pd) return plan;
    return {
      ...plan,
      monthlyAmount: pd.monthly?.amount  ?? plan.monthlyAmount,
      annualAmount:  pd.annual?.amount   ?? plan.annualAmount,
      trialDays:     pd.monthly?.trialDays ?? pd.annual?.trialDays ?? plan.trialDays,
    };
  });

  return (
    <>
      <SEONav />

      {/* HERO */}
      <section style={{ padding: '72px 32px 56px', background: '#fff', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: accent, marginBottom: '14px', display: 'flex', justifyContent: 'center' }}>Planes y precios</div>
          <h1 style={{ fontSize: 'clamp(32px,4vw,52px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 1.02, color: navy, marginBottom: '16px' }}>
            Planes que <span style={{ color: accent }}>crecen con tu flota</span>
          </h1>
          <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.65, margin: '0 auto 32px', maxWidth: '520px' }}>
            Empieza gratis. Actualiza cuando agregues más drones, tripulantes o necesites el SMS empresarial. Sin contratos rígidos. Sin letra pequeña.
          </p>
          {/* Toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '5px' }}>
            <button onClick={() => setAnnual(false)} style={{ padding: '8px 20px', borderRadius: '12px', border: 'none', fontFamily: 'inherit', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', background: !annual ? navy : 'transparent', color: !annual ? '#fff' : '#94a3b8', transition: 'all 0.15s' }}>
              Mensual
            </button>
            <button onClick={() => setAnnual(true)} style={{ padding: '8px 20px', borderRadius: '12px', border: 'none', fontFamily: 'inherit', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', background: annual ? navy : 'transparent', color: annual ? '#fff' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s' }}>
              Anual <span style={{ background: accent, color: '#fff', fontSize: '8px', padding: '2px 7px', borderRadius: '9999px' }}>−20%</span>
            </button>
          </div>
        </div>
      </section>

      {/* PRICING CARDS */}
      <section style={{ padding: '0 32px 80px', background: '#fff' }}>
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" style={{ alignItems: 'start' }}>
          {plans.map(plan => {
            const dispAmount = annual && plan.annualAmount ? plan.annualAmount / 12 : plan.monthlyAmount;
            return (
            <div key={plan.key} style={{ background: plan.dark ? navy : '#fff', border: `1.5px solid ${plan.popular ? accent : '#e2e8f0'}`, borderRadius: '28px', padding: '28px', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: plan.popular ? '0 24px 48px rgba(26,32,44,0.25)' : 'none' }}>
              {plan.popular && (
                <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: accent, color: '#fff', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 14px', borderRadius: '9999px', whiteSpace: 'nowrap' }}>Más popular</div>
              )}
              <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: plan.dark ? accent : '#94a3b8', marginBottom: '4px' }}>{plan.name}</p>
              <p style={{ fontSize: '11px', color: plan.dark ? '#64748b' : '#94a3b8', marginBottom: '16px' }}>{plan.sub}</p>
              <div style={{ marginBottom: '8px' }}>
                {plan.monthlyAmount === null ? (
                  <span style={{ fontSize: '24px', fontWeight: 900, color: plan.dark ? '#fff' : navy }}>A consultar</span>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '28px', fontWeight: 900, color: plan.dark ? '#fff' : navy, lineHeight: 1.2 }}>{fmtCOP(dispAmount)}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: plan.dark ? '#64748b' : '#94a3b8' }}>/mes</span>
                    </div>
                    {annual && plan.annualAmount && (
                      <div style={{ fontSize: '11px', fontWeight: 700, color: plan.dark ? '#64748b' : '#94a3b8', marginTop: '4px' }}>
                        Facturado {fmtCOP(plan.annualAmount)}/año
                      </div>
                    )}
                    {plan.trialDays && (
                      <div style={{ fontSize: '11px', fontWeight: 700, color: accent, marginTop: '4px' }}>
                        🎁 {trialText(plan.trialDays)} gratis al iniciar
                      </div>
                    )}
                  </>
                )}
              </div>
              <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: accent, marginBottom: '20px' }}>{plan.tag}</p>
              <Link href={plan.ctaHref} style={{ display: 'block', textAlign: 'center', padding: '12px', background: plan.popular ? accent : navy, color: '#fff', borderRadius: '14px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none', marginBottom: '20px', boxShadow: plan.popular ? '0 4px 14px rgba(236,91,19,0.4)' : 'none' }}>
                {plan.cta}
              </Link>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {plan.features.map((f, i) => (
                  <li key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '11px', color: plan.dark ? '#94a3b8' : (f.ok ? '#475569' : '#cbd5e1') }}>
                    {f.ok ? <CHECK /> : <CROSS />}
                    {f.text}
                  </li>
                ))}
              </ul>
            </div>
          ); })}
        </div>
      </section>

      {/* ESUAS banner */}
      <section style={{ padding: '0 32px 80px', background: '#fff' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div className="flex flex-col md:flex-row gap-6 md:items-center" style={{ background: '#fff', border: '1.5px solid rgba(236,91,19,0.2)', borderRadius: '28px', padding: '32px 36px' }}>
            <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start', flex: 1 }}>
              <div style={{ width: '48px', height: '48px', background: 'rgba(236,91,19,0.08)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ color: accent, fontSize: '24px' }}>verified_user</span>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: accent, marginBottom: '6px' }}>Oferta especial · Proceso de certificación ESUAS</div>
                <h3 style={{ fontSize: '17px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', color: navy, marginBottom: '8px' }}>¿Tu empresa está certificando como Explotador UAS ante la AeroCivil?</h3>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.65, maxWidth: '620px' }}>Accede a Bitafly <strong>sin costo</strong> durante todo el proceso. Sabemos que cumplir la RAC 100 tiene un costo, y queremos ser parte de la solución. Contáctanos con tu número de radicado.</p>
              </div>
            </div>
            <a href="mailto:soporte@bitafly.com" className="flex shrink-0 items-center justify-center gap-2" style={{ background: accent, color: '#fff', padding: '14px 22px', borderRadius: '16px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none', whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(236,91,19,0.3)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>gavel</span>Solicitar acceso
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ background: '#f8f6f6', padding: '80px 32px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: accent, marginBottom: '12px' }}>Precios — Preguntas</div>
            <h2 style={{ fontSize: 'clamp(28px,3vw,44px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: navy }}>Dudas sobre <span style={{ color: accent }}>planes y precios</span></h2>
          </div>
          {faqItems.map((item, i) => (
            <details key={i} style={{ background: '#fff', border: '1.5px solid #f1f5f9', borderRadius: '18px', overflow: 'hidden', marginBottom: '10px' }}>
              <summary style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', cursor: 'pointer', listStyle: 'none', fontSize: '14px', fontWeight: 900, color: navy }}>
                {item.q}
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: accent, flexShrink: 0 }}>expand_more</span>
              </summary>
              <p style={{ padding: '0 22px 18px', fontSize: '13px', color: '#64748b', lineHeight: 1.7 }}>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div style={{ background: navy, padding: '80px 32px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(28px,3vw,44px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: '#fff', marginBottom: '12px' }}>Empieza hoy. <span style={{ color: accent }}>Gratis por 6 meses.</span></h2>
        <p style={{ fontSize: '15px', color: '#94a3b8', maxWidth: '560px', margin: '0 auto 32px' }}>Sin tarjeta de crédito, sin contratos, sin letra pequeña. Configura en 5 minutos.</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/registro" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#fff', color: navy, padding: '14px 28px', borderRadius: '16px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>rocket_launch</span>Crear cuenta gratis
          </Link>
          <a href="mailto:soporte@bitafly.com" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff', padding: '14px 28px', borderRadius: '16px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none' }}>
            Hablar con ventas
          </a>
        </div>
      </div>

      <SEOFooter brandDesc="Planes y precios de Bitafly para operadores de drones en Colombia. Sin contratos, sin letra pequeña." />
    </>
  );
}
