'use client';

// SORA — reconstruida en el lenguaje visual nuevo (mismo patrón que
// BitacoraDigitalClient/AutorizacionesClient). Foto de hero nueva: torre de
// radar de control de tráfico aéreo real — metáfora directa del ARC (riesgo
// aéreo / espacio aéreo controlado) de la metodología SORA, verificada
// visualmente antes de integrarla.

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@skylog/ui';
import gsap from 'gsap';
import PublicHeader from '@/components/bitafly/PublicHeader';
import { FeatureIcon } from '@/components/bitafly/icons';
import { SoraScene } from '@/components/landing/Illustrations';

const SAIL_LEVELS = [
  { sail: 'I–II', risk: 'Bajo', color: '#22c55e', desc: 'VLOS, área despoblada, dron < 4 kg' },
  { sail: 'III–IV', risk: 'Medio', color: '#f59e0b', desc: 'VLOS área habitada o BVLOS despoblado' },
  { sail: 'V–VI', risk: 'Alto', color: '#ef4444', desc: 'BVLOS sobre áreas habitadas' },
];

const STEPS = [
  { n: '01', label: 'Define el CONOPS', desc: 'Área, altitud, tipo de vuelo y aeronave' },
  { n: '02', label: 'Calcula el GRC', desc: 'Riesgo en tierra según densidad poblacional' },
  { n: '03', label: 'Calcula el ARC', desc: 'Riesgo aéreo según entorno y tráfico' },
  { n: '04', label: 'Aplica mitigaciones', desc: 'Reduce GRC y ARC con medidas técnicas u operacionales' },
  { n: '05', label: 'Obtén el SAIL', desc: 'Nivel de integridad requerido para la operación' },
  { n: '06', label: 'Genera el documento', desc: 'PDF listo para adjuntar a la solicitud AeroCivil' },
];

export default function SoraClient({ faqItems }) {
  const heroRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ctx;
    if (!prefersReduced) {
      ctx = gsap.context(() => {
        gsap.from('.sr-hero-eyebrow, .sr-hero-title, .sr-hero-sub, .sr-hero-cta, .sr-hero-note', {
          opacity: 0,
          y: 16,
          duration: 0.5,
          ease: 'power1.out',
          stagger: 0.08,
        });
        gsap.from('.sr-hero-panel', { opacity: 0, scale: 0.96, duration: 0.6, ease: 'power2.out', delay: 0.15 });
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

  return (
    <div ref={rootRef} className="font-sans text-navy overflow-x-hidden">
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

      {/* HERO — foto real: torre de radar de control de tráfico aéreo */}
      <section ref={heroRef} className="relative isolate min-h-[80vh] flex items-center overflow-hidden">
        <Image
          src="/screenshots/marketing/hero-sora-radar.jpg"
          alt="Torre de radar de control de tráfico aéreo"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_30%] -z-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/40 -z-10" />

        <div className="relative max-w-6xl mx-auto px-6 w-full py-24">
          <div className="grid lg:grid-cols-[1fr_360px] gap-10 items-center">
            <div className="max-w-xl">
              <p className="sr-hero-eyebrow inline-flex items-center gap-2 bg-white/10 backdrop-blur text-primary-200 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">
                SORA · Evaluación de Riesgo RPAS
              </p>
              <h1 className="sr-hero-title text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mt-5">
                Análisis <span className="text-primary-300">SORA</span> para Drones en Colombia
              </h1>
              <p className="sr-hero-sub text-base md:text-lg text-navy-100 max-w-xl mt-5">
                Evalúa el riesgo de tus operaciones RPAS con el método JARUS v2. Calcula GRC, ARC
                y SAIL automáticamente y genera el documento para la AeroCivil en minutos.
              </p>
              <div className="sr-hero-cta flex flex-col sm:flex-row items-center gap-3 mt-8">
                <a href="/registro">
                  <Button variant="primary" className="px-8 py-3.5 text-sm">
                    Comenzar gratis
                  </Button>
                </a>
                <a href="/bitacora-digital" className="text-sm font-semibold text-white/90 hover:text-white underline underline-offset-4 px-2 py-3.5">
                  Ver bitácora digital →
                </a>
              </div>
              <p className="sr-hero-note text-xs text-navy-200 mt-4">
                Incluido en todos los planes · Compatible con RAC 100
              </p>
            </div>

            <div className="sr-hero-panel bg-navy/70 backdrop-blur border border-white/10 rounded-2xl p-6 hidden lg:block">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary-300 mb-4">Niveles SAIL — Resultado SORA</p>
              <div className="space-y-2">
                {SAIL_LEVELS.map((s) => (
                  <div key={s.sail} className="rounded-xl p-3.5" style={{ background: `${s.color}18`, border: `1px solid ${s.color}40` }}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-lg font-black tracking-tight" style={{ color: s.color }}>SAIL {s.sail}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ color: s.color, background: `${s.color}20` }}>Riesgo {s.risk}</span>
                    </div>
                    <div className="text-xs text-navy-200">{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SPOTLIGHT — ilustración real del producto (diagrama SORA) */}
      <section className="py-16 md:py-20 px-6 bg-navy-50">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div className="reveal-fade">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Evaluación de riesgo</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Determina tu nivel <span className="text-primary-600">SAIL</span> con SORA
            </h2>
            <p className="text-sm text-navy-300 mt-3 leading-relaxed">
              Guía paso a paso de la metodología SORA: riesgo en tierra (GRC), riesgo en aire (ARC)
              y el nivel de aseguramiento SAIL resultante, documentado y exportable.
            </p>
            <ul className="mt-5 space-y-2.5">
              {[
                'Cálculo de GRC y ARC guiado por la metodología',
                'Nivel SAIL resultante con OSO aplicables',
                'Plantillas reutilizables por tipo de operación',
                'Resultado documentado para tu manual y la UAEAC',
              ].map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-navy-400">
                  <FeatureIcon name="riesgo" className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="reveal-fade">
            <SoraScene />
          </div>
        </div>
      </section>

      {/* PASOS */}
      <section className="py-16 md:py-20 px-6 bg-navy">
        <div className="max-w-5xl mx-auto">
          <div className="reveal-fade text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-300">Proceso</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mt-1">Análisis SORA en 6 pasos</h2>
          </div>
          <div className="reveal-stagger grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-white/[0.06] border border-white/10 rounded-2xl p-5">
                <p className="text-2xl font-black text-primary-300 tracking-tight mb-1.5">{s.n}</p>
                <p className="font-bold text-white text-sm">{s.label}</p>
                <p className="text-sm text-navy-200 mt-1 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 px-6 bg-navy-50">
        <div className="max-w-3xl mx-auto">
          <div className="reveal-fade text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">SORA — Preguntas</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">Preguntas frecuentes sobre SORA</h2>
          </div>
          <div className="reveal-stagger space-y-3">
            {faqItems.map((item) => (
              <details key={item.name} className="group bg-white rounded-2xl border border-navy-100 overflow-hidden">
                <summary className="flex items-center justify-between gap-3 p-4 cursor-pointer list-none">
                  <span className="font-bold text-navy text-sm pr-2">{item.name}</span>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary-600 shrink-0 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-sm text-navy-300 leading-relaxed">{item.acceptedAnswer.text}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative isolate overflow-hidden py-24 px-6 bg-navy text-center">
        <div className="reveal-fade max-w-xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-300 mb-3">Listo para comenzar</p>
          <h2 className="text-2xl md:text-3xl font-black text-white">Evalúa tus operaciones con SORA hoy</h2>
          <p className="text-sm text-navy-100 mt-3">
            Sin experiencia en aviación requerida. Bitafly guía cada paso del análisis y genera el documento para la AeroCivil automáticamente.
          </p>
          <a href="/registro" className="inline-block mt-6">
            <Button variant="primary" className="px-8 py-3.5 text-sm">
              Comenzar gratis — sin tarjeta
            </Button>
          </a>
        </div>
      </section>
    </div>
  );
}
