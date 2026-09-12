'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import PublicHeader from '@/components/bitafly/PublicHeader';
import PublicFooter from '@/components/bitafly/PublicFooter';
import { fmtCOP } from '@/lib/formatters';

const TRUST_BADGES = [
  { icon: 'verified_user',   label: 'RAC 100 / 2024' },
  { icon: 'gavel',           label: 'AeroCivil · UAEAC' },
  { icon: 'lock',            label: 'Datos en Colombia' },
  { icon: 'credit_card_off', label: 'Sin tarjeta para iniciar' },
];

const faqItems = [
  { q: '¿El plan Piloto requiere tarjeta de crédito para empezar?', a: 'No. El plan Piloto incluye 15 días de prueba sin necesidad de tarjeta de crédito; al finalizar, se realiza el primer cobro. Si tu empresa está en Fase 0 del proceso de certificación como Explotador UAS, puedes acceder sin costo al plan Escuadrilla durante esa etapa (hasta 6 meses) contactando a nuestro equipo.' },
  { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí. Puedes actualizar o degradar tu plan en cualquier momento desde el panel de suscripción. Los cambios aplican al siguiente período de facturación. Si actualizas, el acceso a las nuevas funciones es inmediato.' },
  { q: '¿Hay descuento por pago anual?', a: 'Sí. El pago anual tiene un descuento del 10%. El plan Escuadrilla pasa de $200.000/mes a $180.000/mes (equivalente, + IVA). El plan Flota pasa de $400.000/mes a $360.000/mes (equivalente, + IVA). Selecciona "Anual" en el toggle de precios para ver los valores exactos.' },
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
    key: 'piloto',     monthlyAmount: 20000,  annualAmount: 200000,  trialDays: 15,
    name: 'Piloto',    sub: 'Para el piloto autónomo',  tag: '1 aeronave · 1 usuario',
    cta: 'Comenzar gratis', ctaHref: '/registro', dark: false,
    features: [
      { ok: true,  text: '1 aeronave registrada' },
      { ok: true,  text: 'Bitácora RAC 100 ilimitada' },
      { ok: true,  text: 'Alertas de mantenimiento' },
      { ok: true,  text: 'Hasta 3 baterías' },
      { ok: true,  text: 'Reporte PDF (código personalizable)' },
      { ok: false, text: 'Autorizaciones (código personalizable)' },
      { ok: false, text: 'SMS aeronáutico' },
      { ok: false, text: 'Multi-usuario' },
    ],
  },
  {
    key: 'escuadrilla', monthlyAmount: 238000, annualAmount: 2570400,  trialDays: null,
    name: 'Escuadrilla', sub: 'Para pequeñas empresas', tag: '3 aeronaves · 5 usuarios',
    cta: 'Comenzar ahora', ctaHref: '/registro', dark: false,
    features: [
      { ok: true,  text: 'Hasta 3 aeronaves' },
      { ok: true,  text: 'Hasta 5 usuarios (3 pilotos + jefe de pilotos + gerente SMS)' },
      { ok: true,  text: 'Bitácora RAC 100 ilimitada' },
      { ok: true,  text: 'Baterías ilimitadas' },
      { ok: true,  text: 'Autorizaciones (código personalizable)' },
      { ok: true,  text: 'Todos los reportes en PDF/Excel — cada código 100% personalizable' },
      { ok: true,  text: 'SMS completo con trazabilidad' },
      { ok: true,  text: 'Auditoría y trazabilidad completa' },
      { ok: true,  text: 'Checklists personalizables' },
    ],
  },
  {
    key: 'flota',      monthlyAmount: 476000, annualAmount: 5140800, trialDays: null,
    name: 'Flota',     sub: 'Para empresas medianas', tag: '10 aeronaves · 10 usuarios',
    cta: 'Comenzar ahora', ctaHref: '/registro', dark: true, popular: true,
    features: [
      { ok: true, text: 'Hasta 10 aeronaves' },
      { ok: true, text: '10 usuarios · 5 roles RAC 100' },
      { ok: true, text: 'Todos los reportes en PDF/Excel — cada código 100% personalizable' },
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
  if (days % 30 === 0) {
    const m = days / 30;
    return m === 1 ? '1 mes' : `${m} meses`;
  }
  return days === 1 ? '1 día' : `${days} días`;
}

export default function PreciosClient() {
  const [annual, setAnnual] = useState(false);
  const [prices, setPrices] = useState(null);
  const heroRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    fetch('/api/plans/public')
      .then(r => { if (!r.ok) { console.warn('[fetch] /api/plans/public failed:', r.status); return null; } return r.json(); })
      .then(data => { if (data && !data.error) setPrices(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ctx;
    if (!prefersReduced) {
      ctx = gsap.context(() => {
        gsap.from('.pc-hero-eyebrow, .pc-hero-title, .pc-hero-sub, .pc-hero-toggle, .pc-hero-badges', {
          opacity: 0,
          y: 16,
          duration: 0.5,
          ease: 'power1.out',
          stagger: 0.08,
        });
      }, heroRef);
    }

    const revealTargets = [
      ...document.querySelectorAll('.reveal-fade'),
      ...document.querySelectorAll('.reveal-stagger'),
    ];
    revealTargets.forEach((el) => el.classList.add('reveal-pending'));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          if (el.classList.contains('reveal-stagger')) {
            Array.from(el.children).forEach((child, i) => {
              child.style.transitionDelay = `${i * 70}ms`;
            });
          }
          el.classList.remove('reveal-pending');
          observer.unobserve(el);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    revealTargets.forEach((el) => observer.observe(el));

    return () => {
      if (ctx) ctx.revert();
      observer.disconnect();
    };
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
    <div ref={rootRef}>
      <style jsx global>{`
        .reveal-fade,
        .reveal-stagger > * {
          transition: opacity 0.4s ease-out, transform 0.4s ease-out;
        }
        .reveal-fade.reveal-pending {
          opacity: 0;
          transform: translateY(12px);
        }
        .reveal-stagger.reveal-pending > * {
          opacity: 0;
          transform: translateY(16px) scale(0.97);
        }
      `}</style>

      <PublicHeader />

      {/* HERO — full-bleed, foto real de dos drones en vuelo (metáfora de "crecer con tu flota") */}
      <section ref={heroRef} className="relative isolate overflow-hidden py-24 px-6 text-center">
        <Image
          src="/screenshots/marketing/hero-precios-flota.jpg"
          alt="Dos drones de tamaños distintos en vuelo, uno pequeño y uno industrial"
          fill
          priority
          sizes="100vw"
          className="object-cover -z-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/90 via-navy/85 to-navy/95 -z-10" />
        <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative' }}>
          <div className="pc-hero-eyebrow" style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: accent, marginBottom: '14px', display: 'flex', justifyContent: 'center' }}>Planes y precios</div>
          <h1 className="pc-hero-title" style={{ fontSize: 'clamp(32px,4vw,52px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 1.02, color: '#fff', marginBottom: '16px' }}>
            Planes que <span style={{ color: accent }}>crecen con tu flota</span>
          </h1>
          <p className="pc-hero-sub" style={{ fontSize: '15px', color: '#cbd5e1', lineHeight: 1.65, margin: '0 auto 32px', maxWidth: '520px' }}>
            Empieza gratis. Actualiza cuando agregues más drones, tripulantes o necesites el SMS empresarial. Sin contratos rígidos. Sin letra pequeña.
          </p>
          {/* Toggle */}
          <div className="pc-hero-toggle" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '5px' }}>
            <button onClick={() => setAnnual(false)} style={{ padding: '8px 20px', borderRadius: '12px', border: 'none', fontFamily: 'inherit', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', background: !annual ? '#fff' : 'transparent', color: !annual ? navy : '#cbd5e1', transition: 'all 0.15s' }}>
              Mensual
            </button>
            <button onClick={() => setAnnual(true)} style={{ padding: '8px 20px', borderRadius: '12px', border: 'none', fontFamily: 'inherit', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', background: annual ? '#fff' : 'transparent', color: annual ? navy : '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s' }}>
              Anual <span style={{ background: accent, color: '#fff', fontSize: '8px', padding: '2px 7px', borderRadius: '9999px' }}>−10%</span>
            </button>
          </div>

          {/* Badges de confianza */}
          <ul className="pc-hero-badges" style={{ listStyle: 'none', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', margin: '28px 0 0', padding: 0 }} aria-label="Certificaciones y características">
            {TRUST_BADGES.map(b => (
              <li key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '9999px', background: 'rgba(255,255,255,0.08)', fontSize: '11px', fontWeight: 700, color: '#e2e8f0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px', color: accent }} aria-hidden="true">{b.icon}</span>
                {b.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* PRICING CARDS */}
      <section className="reveal-fade" style={{ padding: '56px 32px 80px', background: '#fff' }}>
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" style={{ alignItems: 'start' }}>
          {plans.map(plan => {
            // Escuadrilla/Flota: el monto guardado (ePayco/DB) es el TOTAL con IVA.
            // Se muestra el valor base sin IVA + rótulo "IVA no incluido".
            const excludesIva = plan.key === 'escuadrilla' || plan.key === 'flota';
            const rawAmount = annual && plan.annualAmount ? plan.annualAmount / 12 : plan.monthlyAmount;
            const dispAmount = excludesIva && rawAmount != null ? rawAmount / 1.19 : rawAmount;
            const dispAnnualAmount = excludesIva && plan.annualAmount != null ? plan.annualAmount / 1.19 : plan.annualAmount;
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
                      <span style={{ fontSize: '11px', fontWeight: 700, color: plan.dark ? '#64748b' : '#94a3b8' }}>/mes{excludesIva ? ' + IVA' : ''}</span>
                    </div>
                    {excludesIva && (
                      <div style={{ fontSize: '10px', fontWeight: 600, color: plan.dark ? '#64748b' : '#94a3b8', marginTop: '2px' }}>
                        IVA no incluido
                      </div>
                    )}
                    {annual && plan.annualAmount && (
                      <div style={{ fontSize: '11px', fontWeight: 700, color: plan.dark ? '#64748b' : '#94a3b8', marginTop: '4px' }}>
                        Facturado {fmtCOP(dispAnnualAmount)}/año{excludesIva ? ' + IVA' : ''}
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

      {/* SUSCRIPCIÓN REAL — screenshot real del panel, no solo texto (ver
          docs/plan-mejora-visual-landing-bitafly.md, Fase 3) */}
      <section className="reveal-fade" style={{ padding: '0 32px 80px', background: '#fff' }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: accent, marginBottom: '12px' }}>
              Sin sorpresas
            </div>
            <h2 style={{ fontSize: 'clamp(24px,3vw,36px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 1.08, color: navy, marginBottom: '16px' }}>
              Ves exactamente <span style={{ color: accent }}>qué estás pagando</span>
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.7, maxWidth: '460px', marginBottom: '20px' }}>
              Tu panel de suscripción muestra en tiempo real cuántas aeronaves y pilotos
              llevas usados de tu cupo, los vuelos del mes, y la opción de sumar
              recursos adicionales sin cambiar de plan — todo desde adentro de Bitafly,
              sin letra pequeña ni cobros ocultos.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                'Medidores de uso de aeronaves y pilotos en vivo',
                'Recursos adicionales (piloto o dron extra) sin subir de plan',
                'Historial de facturación y cancelación en un clic',
              ].map((b) => (
                <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', fontWeight: 500, color: '#475569', lineHeight: 1.5 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: accent, flexShrink: 0 }}>check_circle</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <Image
            src="/screenshots/suscripcion.jpg"
            alt="Panel de suscripción de Bitafly con cupo de aeronaves, pilotos y recursos adicionales"
            width={1440}
            height={756}
            className="w-full h-auto rounded-3xl shadow-2xl border border-slate-200"
          />
        </div>
      </section>

      {/* ESUAS banner */}
      <section className="reveal-fade" style={{ padding: '0 32px 80px', background: '#fff' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div className="flex flex-col md:flex-row gap-6 md:items-center" style={{ background: '#fff', border: '1.5px solid rgba(236,91,19,0.2)', borderRadius: '28px', padding: '32px 36px' }}>
            <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start', flex: 1 }}>
              <div style={{ width: '48px', height: '48px', background: 'rgba(236,91,19,0.08)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ color: accent, fontSize: '24px' }}>verified_user</span>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: accent, marginBottom: '6px' }}>Fase 0 · Proceso de certificación ESUAS</div>
                <h3 style={{ fontSize: '17px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', color: navy, marginBottom: '8px' }}>¿Tu empresa está certificando como Explotador UAS ante la AeroCivil?</h3>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.65, maxWidth: '620px' }}>Si estás en Fase 0 del proceso, accede al plan Escuadrilla de Bitafly <strong>sin costo</strong> durante esa etapa, hasta un máximo de 6 meses. Contáctanos con tu número de radicado.</p>
              </div>
            </div>
            <a href="mailto:soporte@bitafly.com" className="flex shrink-0 items-center justify-center gap-2" style={{ background: accent, color: '#fff', padding: '14px 22px', borderRadius: '16px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none', whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(236,91,19,0.3)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>gavel</span>Solicitar acceso
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="reveal-fade" style={{ background: '#f8f6f6', padding: '80px 32px' }}>
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
      <div className="reveal-fade" style={{ background: navy, padding: '80px 32px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(28px,3vw,44px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: '#fff', marginBottom: '12px' }}>Empieza hoy. <span style={{ color: accent }}>15 días gratis.</span></h2>
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

      <PublicFooter brandDesc="Planes y precios de Bitafly para operadores de drones en Colombia. Sin contratos, sin letra pequeña." />
    </div>
  );
}
