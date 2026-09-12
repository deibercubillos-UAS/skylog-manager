'use client';

// Capacitación y Examen — página nueva (no existía en el sitio público).
// Describe el módulo real de Capacitación (dashboard/training): cronograma
// con recurrencia, examen calificado con banco de preguntas y bloqueo de
// despacho, más el tab de Capacitación SMS (cronograma + asistencia de todo
// el personal). Ver docs/skylog-v2/51-bitacora.md / CLAUDE.md "Capacitación
// v2". Sin screenshot real disponible todavía en public/screenshots/ para
// este módulo — el hero usa una foto de stock real (mano escribiendo en un
// portapapeles), no un mockup fabricado de la interfaz (regla V1).

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@skylog/ui';
import gsap from 'gsap';
import PublicHeader from '@/components/bitafly/PublicHeader';
import PublicFooter from '@/components/bitafly/PublicFooter';
import { FeatureIcon } from '@/components/bitafly/icons';

const TRUST_STATS = [
  { value: '2', label: 'Programas: Operaciones y Mantenimiento' },
  { value: '100%', label: 'Nota mínima e intentos configurables' },
  { value: 'Auto', label: 'Bloqueo de despacho' },
  { value: '3/5/7', label: 'Días de recordatorio antes de vencer' },
];

const FEATURES = [
  { icon: 'reportes', title: 'Examen con Banco de Preguntas', desc: 'Crea tu banco de preguntas de opción múltiple por programa (Operaciones o Mantenimiento). El piloto nunca ve la respuesta correcta mientras responde.' },
  { icon: 'lock', title: 'Nota Mínima e Intentos', desc: 'Define el puntaje mínimo para aprobar y cuántos intentos se permiten por ciclo. Se agotan los intentos, se agota el ciclo — sin excepciones manuales.' },
  { icon: 'riesgo', title: 'Bloqueo Real de Despacho', desc: 'Si el piloto no aprueba a tiempo, el wizard de despacho se reemplaza por una pantalla de bloqueo con enlace directo a presentar el examen. Aplica también al piloto independiente.' },
  { icon: 'clima', title: 'Cronograma con Recurrencia', desc: 'Programa sesiones y ciclos de examen semanales, quincenales, mensuales o personalizados — sin recalcular fechas a mano cada vez.' },
  { icon: 'bitacora', title: 'Queda en el Expediente', desc: 'Cada intento calificado se registra automáticamente en el expediente del tripulante (evaluador "Examen interno") — visible en Tripulación y en el PDF del expediente.' },
  { icon: 'sms', title: 'Capacitación SMS Integrada', desc: 'Un tercer tab reutiliza el mismo cronograma para la capacitación de seguridad operacional, con registro de asistencia de todo el personal, no solo pilotos.' },
];

const STEPS = [
  { n: '1', t: 'Configura el programa', d: 'Define el banco de preguntas, la nota mínima y los intentos permitidos por ciclo — uno para Operaciones y otro para Mantenimiento.' },
  { n: '2', t: 'El piloto presenta el examen', d: 'Antes de vencer el plazo, el piloto responde el banco de preguntas del ciclo vigente desde su propio dashboard.' },
  { n: '3', t: 'Se califica y queda registrado', d: 'Si aprueba, el despacho queda habilitado y el resultado se suma automáticamente a su expediente. Si no, el sistema bloquea sus próximos vuelos hasta que esté al día.' },
];

export default function CapacitacionClient({ faqItems }) {
  const heroRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ctx;
    if (!prefersReduced) {
      ctx = gsap.context(() => {
        gsap.from('.cp-hero-eyebrow, .cp-hero-title, .cp-hero-sub, .cp-hero-cta, .cp-hero-note', {
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

      {/* HERO — foto real: mano diligenciando un formulario en un portapapeles */}
      <section ref={heroRef} className="relative isolate min-h-[80vh] flex items-center overflow-hidden">
        <Image
          src="/screenshots/marketing/hero-capacitacion-examen.jpg"
          alt="Mano escribiendo en un portapapeles durante una evaluación"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[55%_45%] -z-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/35 -z-10" />

        <div className="relative max-w-6xl mx-auto px-6 w-full py-24">
          <div className="max-w-2xl">
            <p className="cp-hero-eyebrow inline-flex items-center gap-2 bg-white/10 backdrop-blur text-primary-200 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">
              Capacitación y Examen · Bloqueo Real de Despacho
            </p>
            <h1 className="cp-hero-title text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mt-5">
              Capacitación con <span className="text-primary-300">Examen Calificado</span> para tu Tripulación
            </h1>
            <p className="cp-hero-sub text-base md:text-lg text-navy-100 max-w-xl mt-5">
              No es un registro manual de asistencia: es un examen interno real, con banco de
              preguntas, nota mínima e intentos configurables. Si un piloto no está al día, el
              sistema bloquea su despacho — sin excepciones de palabra.
            </p>
            <div className="cp-hero-cta flex flex-col sm:flex-row items-center gap-3 mt-8">
              <a href="/registro">
                <Button variant="primary" className="px-8 py-3.5 text-sm">
                  Comenzar gratis
                </Button>
              </a>
              <a href="/sms-aeronautico" className="text-sm font-semibold text-white/90 hover:text-white underline underline-offset-4 px-2 py-3.5">
                Ver módulo SMS →
              </a>
            </div>
            <p className="cp-hero-note text-xs text-navy-200 mt-4">
              Incluido en todos los planes · Aplica también al piloto independiente
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

      {/* FEATURES */}
      <section className="py-16 md:py-20 px-6 bg-navy">
        <div className="max-w-5xl mx-auto">
          <div className="reveal-fade text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-300">Módulo de Capacitación</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
              Un examen real, <span className="text-primary-300">no un registro de asistencia</span>
            </h2>
          </div>
          <div className="reveal-stagger grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((item) => (
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

      {/* CÓMO FUNCIONA */}
      <section className="py-16 md:py-20 px-6 bg-navy-50">
        <div className="max-w-4xl mx-auto">
          <div className="reveal-fade text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">En 3 pasos</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Del banco de preguntas <span className="text-primary-600">al despacho habilitado</span>
            </h2>
          </div>
          <div className="reveal-stagger grid sm:grid-cols-3 gap-5">
            {STEPS.map((step) => (
              <div key={step.n} className="bg-white border border-navy-100 rounded-2xl p-6">
                <p className="text-2xl font-black text-primary-600 mb-2">{step.n}</p>
                <p className="font-bold text-navy text-sm mb-1.5">{step.t}</p>
                <p className="text-sm text-navy-300 leading-relaxed">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="reveal-fade text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Capacitación — Preguntas</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Todo sobre el <span className="text-primary-600">examen interno</span>
            </h2>
          </div>
          <div className="reveal-stagger space-y-3">
            {faqItems.map((item) => (
              <details key={item.name} className="group bg-navy-50 rounded-2xl border border-navy-100 overflow-hidden">
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
          <h2 className="text-2xl md:text-3xl font-black text-white">
            Tripulación <span className="text-primary-300">certificada, no solo registrada</span>
          </h2>
          <p className="text-sm text-navy-100 mt-3">
            Configura el banco de preguntas de tu organización y deja que Bitafly bloquee el despacho automáticamente.
          </p>
          <a href="/registro" className="inline-block mt-6">
            <Button variant="primary" className="px-8 py-3.5 text-sm">
              Comenzar gratis
            </Button>
          </a>
        </div>
      </section>

      <PublicFooter brandDesc="Capacitación y examen calificado para pilotos UAS en Colombia, con bloqueo automático de despacho." />
    </div>
  );
}
