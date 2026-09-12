'use client';

// Gestión de Pilotos — reconstruida en el lenguaje visual nuevo. Foto de
// hero nueva: piloto real observando su dron en vuelo, verificada
// visualmente. El mockup ficticio del hero (pilotos inventados "Carlos
// Mendoza", "Daniela Ríos", "Felipe Torres" con CPR y horas fabricadas) se
// retiró (regla V1) — no existe un screenshot real de este módulo en el
// repo todavía, así que el spotlight conserva `CrewScene` (ilustración SVG
// real ya usada en producción), sin inventar datos de tripulantes.

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@skylog/ui';
import gsap from 'gsap';
import PublicHeader from '@/components/bitafly/PublicHeader';
import { FeatureIcon } from '@/components/bitafly/icons';
import { CrewScene } from '@/components/landing/Illustrations';

const TRUST_STATS = [
  { value: '∞', label: 'Pilotos por organización' },
  { value: '3', label: 'Roles operacionales' },
  { value: '30/7', label: 'Días de alerta previa al CPR' },
  { value: '0', label: 'Papeleo' },
];

const FEATURES = [
  { icon: 'reportes', title: 'Certificados CPR', desc: 'Almacena número, fecha de emisión y vencimiento de cada piloto. Alertas automáticas 30 y 7 días antes del vencimiento.' },
  { icon: 'timer', title: 'Horas de vuelo', desc: 'Contador acumulado por piloto, actualizado automáticamente con cada vuelo registrado en la bitácora.' },
  { icon: 'roles', title: 'Roles diferenciados', desc: 'Jefe de Pilotos, Piloto Remoto y Observador. Cada rol tiene permisos y vistas específicas según la RAC 100.' },
  { icon: 'bitacora', title: 'Historial de misiones', desc: 'Registro completo de todos los vuelos en que participó cada piloto, con fecha, aeronave y resultado.' },
  { icon: 'lock', title: 'Documentos digitales', desc: 'Adjunta CPR, antecedentes médicos y certificados adicionales. Siempre disponibles para auditoría.' },
  { icon: 'persona', title: 'Invitaciones por email', desc: 'Agrega pilotos a tu organización enviando una invitación. Ellos crean su perfil y se vinculan automáticamente.' },
];

export default function GestionPilotosClient({ faqItems }) {
  const heroRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ctx;
    if (!prefersReduced) {
      ctx = gsap.context(() => {
        gsap.from('.gp-hero-eyebrow, .gp-hero-title, .gp-hero-sub, .gp-hero-cta, .gp-hero-note', {
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

      {/* HERO — foto real: piloto observando su dron en vuelo */}
      <section ref={heroRef} className="relative isolate min-h-[80vh] flex items-center overflow-hidden">
        <Image
          src="/screenshots/marketing/hero-pilotos-tripulacion.jpg"
          alt="Piloto observando su dron en vuelo sobre un paisaje abierto"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[75%_45%] -z-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/35 -z-10" />

        <div className="relative max-w-6xl mx-auto px-6 w-full py-24">
          <div className="max-w-2xl">
            <p className="gp-hero-eyebrow inline-flex items-center gap-2 bg-white/10 backdrop-blur text-primary-200 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">
              Tripulación · Certificaciones RAC 100
            </p>
            <h1 className="gp-hero-title text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mt-5">
              Gestión de <span className="text-primary-300">Pilotos UAS</span> y Certificaciones CPR
            </h1>
            <p className="gp-hero-sub text-base md:text-lg text-navy-100 max-w-xl mt-5">
              Controla certificados CPR, horas de vuelo acumuladas, historial de misiones y
              documentación de toda tu tripulación. Alertas automáticas antes de cada vencimiento.
            </p>
            <div className="gp-hero-cta flex flex-col sm:flex-row items-center gap-3 mt-8">
              <a href="/registro">
                <Button variant="primary" className="px-8 py-3.5 text-sm">
                  Comenzar gratis
                </Button>
              </a>
              <a href="/bitacora-digital" className="text-sm font-semibold text-white/90 hover:text-white underline underline-offset-4 px-2 py-3.5">
                Ver bitácora digital →
              </a>
            </div>
            <p className="gp-hero-note text-xs text-navy-200 mt-4">
              Pilotos ilimitados en todos los planes · Sin configuración técnica
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

      {/* SPOTLIGHT */}
      <section className="py-16 md:py-20 px-6 bg-navy-50">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div className="reveal-fade">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Expediente de tripulación</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Cada piloto con sus <span className="text-primary-600">certificados</span> al día
            </h2>
            <p className="text-sm text-navy-300 mt-3 leading-relaxed">
              Médico aeronáutico, licencia, horas voladas y vencimientos por tripulante. Bitafly
              te avisa 30 días antes de que un certificado expire.
            </p>
            <ul className="mt-5 space-y-2.5">
              {[
                'Expediente digital por tripulante con anexos',
                'Alertas 30 días antes del vencimiento del médico',
                'Horas voladas acumuladas por piloto',
                'Roles operacionales con permisos granulares',
              ].map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-navy-400">
                  <FeatureIcon name="riesgo" className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="reveal-fade">
            <CrewScene />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-16 md:py-20 px-6 bg-navy">
        <div className="max-w-5xl mx-auto">
          <div className="reveal-fade text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-300">Módulo de Tripulación</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mt-1">Todo sobre tu equipo en un solo lugar</h2>
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

      {/* FAQ */}
      <section className="py-16 md:py-20 px-6 bg-navy-50">
        <div className="max-w-3xl mx-auto">
          <div className="reveal-fade text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1 text-center">Preguntas sobre gestión de pilotos</h2>
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
          <p className="text-xs font-bold uppercase tracking-widest text-primary-300 mb-3">Sin papeleo</p>
          <h2 className="text-2xl md:text-3xl font-black text-white">Tu tripulación, siempre al día</h2>
          <p className="text-sm text-navy-100 mt-3">
            Bitafly gestiona certificaciones, horas de vuelo y documentación de tu equipo. Sin hojas de cálculo ni carpetas de Drive.
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
