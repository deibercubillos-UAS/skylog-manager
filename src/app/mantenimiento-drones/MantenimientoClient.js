'use client';

// Mantenimiento de Drones — reconstruida en el lenguaje visual nuevo (mismo
// patrón que las demás páginas migradas). Foto de hero nueva: técnico
// reparando/soldando un dron en su banco de trabajo, verificada visualmente.
// El mockup ficticio de aeronaves/baterías con datos inventados se retiró del
// hero (regla V1) — el dato real vive en "En acción" con el screenshot real
// de /screenshots/mantenimiento.jpg.

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@skylog/ui';
import gsap from 'gsap';
import PublicHeader from '@/components/bitafly/PublicHeader';
import PublicFooter from '@/components/bitafly/PublicFooter';
import { FeatureIcon } from '@/components/bitafly/icons';

const TRUST_STATS = [
  { value: '200h', label: 'Umbral mantenimiento' },
  { value: '200', label: 'Ciclos batería por defecto' },
  { value: '100%', label: 'Código personalizable' },
  { value: '∞', label: 'Baterías registrables' },
];

const CAMPOS = [
  { icon: 'timer', title: 'Alertas por Horas de Vuelo', desc: 'Alerta automática cuando la aeronave alcanza 200 horas de vuelo acumuladas. Umbral configurable según las recomendaciones del fabricante.' },
  { icon: 'clima', title: 'Alertas por Calendario', desc: 'Recordatorio automático cada 6 meses calendario desde la última intervención técnica, independiente de las horas de vuelo acumuladas.' },
  { icon: 'bateria', title: 'Control de Ciclos LiPo', desc: 'Registro de ciclos por batería con umbral configurable. Detecta inflamiento, registra eventos anómalos y previene fallos en operación crítica.' },
  { icon: 'mantenimiento', title: 'Historial de Intervenciones', desc: 'Trazabilidad completa de cada cambio de hélice, calibración de sensores, revisión de motores y reparación. Con fecha, técnico responsable y horas al momento.' },
  { icon: 'riesgo', title: 'Bloqueo Preventivo', desc: 'Opción de bloquear el registro de nuevos vuelos en aeronaves con mantenimiento vencido, evitando operaciones fuera de cumplimiento.' },
  { icon: 'reportes', title: 'Registro de Baterías en PDF', desc: 'Exporta el registro con número de serie, ciclos, estado de cada batería e historial de intervenciones, con tu propio código de formato. Listo para auditorías.' },
];

export default function MantenimientoClient({ faqItems }) {
  const heroRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ctx;
    if (!prefersReduced) {
      ctx = gsap.context(() => {
        gsap.from('.mt-hero-eyebrow, .mt-hero-title, .mt-hero-sub, .mt-hero-cta, .mt-hero-note', {
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

      {/* HERO — foto real: técnico reparando un dron en su banco de trabajo */}
      <section ref={heroRef} className="relative isolate min-h-[80vh] flex items-center overflow-hidden">
        <Image
          src="/screenshots/marketing/hero-mantenimiento-taller.jpg"
          alt="Técnico reparando un dron en su banco de trabajo"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[45%_55%] -z-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/35 -z-10" />

        <div className="relative max-w-6xl mx-auto px-6 w-full py-24">
          <div className="max-w-2xl">
            <p className="mt-hero-eyebrow inline-flex items-center gap-2 bg-white/10 backdrop-blur text-primary-200 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">
              Alertas automáticas · Código personalizable
            </p>
            <h1 className="mt-hero-title text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mt-5">
              Mantenimiento de <span className="text-primary-300">Drones y Baterías LiPo</span>
            </h1>
            <p className="mt-hero-sub text-base md:text-lg text-navy-100 max-w-xl mt-5">
              Alertas automáticas a 200 horas de vuelo o 6 meses. Control de ciclos de baterías
              LiPo. Historial completo de intervenciones. Registro de Baterías en PDF con tu
              propio código de formato.
            </p>
            <div className="mt-hero-cta flex flex-col sm:flex-row items-center gap-3 mt-8">
              <a href="/registro">
                <Button variant="primary" className="px-8 py-3.5 text-sm">
                  Comenzar gratis
                </Button>
              </a>
              <a href="/gestion-flota-drones" className="text-sm font-semibold text-white/90 hover:text-white underline underline-offset-4 px-2 py-3.5">
                Ver gestión de flota →
              </a>
            </div>
            <p className="mt-hero-note text-xs text-navy-200 mt-4">
              Sin tarjeta de crédito · Alertas ilimitadas · Soporte en español
            </p>
          </div>
        </div>

        <div className="reveal-stagger absolute inset-x-0 bottom-0 bg-navy/80 backdrop-blur border-t border-white/10 py-5 px-6">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {TRUST_STATS.map((st) => (
              <div key={st.label}>
                <p className="text-xl md:text-2xl font-black text-primary-300">{st.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-navy-200 mt-0.5">{st.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EN ACCIÓN — screenshot real del producto */}
      <section className="py-16 md:py-20 px-6 bg-navy-50">
        <div className="max-w-5xl mx-auto">
          <div className="reveal-fade text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Ciclos y alertas</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Mantenimiento <span className="text-primary-600">predictivo</span> sin hojas de cálculo
            </h2>
            <p className="text-sm text-navy-300 mt-2 max-w-lg mx-auto">
              Bitafly cuenta los ciclos de cada batería LiPo y las horas de cada aeronave por ti.
              Cuando se acerca un umbral, dispara la alerta antes de que sea un problema en operación.
            </p>
          </div>
          <div className="reveal-fade relative aspect-[1568/718] rounded-3xl overflow-hidden border border-navy-100 shadow-xl bg-white p-3 sm:p-4">
            <Image
              src="/screenshots/mantenimiento.jpg"
              alt="Pantalla de Mantenimiento de Bitafly con el estado de la flota"
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-contain rounded-xl"
            />
          </div>
        </div>
      </section>

      {/* CAMPOS */}
      <section className="py-16 md:py-20 px-6 bg-navy">
        <div className="max-w-5xl mx-auto">
          <div className="reveal-fade text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-300">Control técnico</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
              Todo el mantenimiento de tu flota <span className="text-primary-300">bajo control</span>
            </h2>
          </div>
          <div className="reveal-stagger grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CAMPOS.map((item) => (
              <div
                key={item.title}
                className="bg-white/[0.06] border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-primary-400/40 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary-300 flex items-center justify-center mb-3">
                  <FeatureIcon name={item.icon} className="w-5 h-5" />
                </div>
                <p className="font-bold text-white text-sm">{item.title}</p>
                <p className="text-sm text-navy-200 mt-1.5 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 px-6 bg-navy-50">
        <div className="max-w-3xl mx-auto">
          <div className="reveal-fade text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Mantenimiento — Preguntas</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Todo sobre el <span className="text-primary-600">Registro de Baterías</span>
            </h2>
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
      <section className="relative isolate overflow-hidden py-24 px-6">
        <Image
          src="/screenshots/marketing/hero-drone.jpg"
          alt="Dron volando en exteriores"
          fill
          sizes="100vw"
          className="object-cover -z-20"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/70 to-navy/40 -z-10" />
        <div className="reveal-fade max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-black text-white">
            Nunca más una aeronave fuera de <span className="text-primary-300">cumplimiento</span>
          </h2>
          <p className="text-sm text-navy-100 mt-2">
            Alertas automáticas, historial trazable y reportes PDF para la AeroCivil.
          </p>
          <a href="/registro" className="inline-block mt-6">
            <Button variant="primary" className="px-8 py-3.5 text-sm">
              Comenzar gratis
            </Button>
          </a>
        </div>
      </section>

      <PublicFooter brandDesc="Mantenimiento de drones y baterías LiPo con cumplimiento RAC 100. Código de formato 100% personalizable." />
    </div>
  );
}
