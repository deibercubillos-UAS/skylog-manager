'use client';

// Reportes y Auditoría — reconstruida en el lenguaje visual nuevo. Foto de
// hero nueva: reporte impreso real con gráficas y carpeta de archivo,
// verificada visualmente. El mockup ficticio de reportes con datos
// inventados ("22 vuelos", "C. Martínez · 412h") se retiró del hero (regla
// V1) — el dato real vive en "En acción" con el screenshot real
// /screenshots/reportes.jpg.

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@skylog/ui';
import gsap from 'gsap';
import PublicHeader from '@/components/bitafly/PublicHeader';
import PublicFooter from '@/components/bitafly/PublicFooter';
import { FeatureIcon } from '@/components/bitafly/icons';

const TRUST_STATS = [
  { value: '4', label: 'Reportes RAC 100' },
  { value: '<5s', label: 'Tiempo de generación' },
  { value: 'PDF', label: 'Con logo corporativo' },
  { value: '100%', label: 'Código personalizable' },
];

const REPORTS = [
  { icon: 'bitacora', title: 'Maestro de Vuelo', desc: 'Registro cronológico de todos los vuelos del período: aeronave, tripulación, misión, tiempos y horas acumuladas. El reporte principal de la bitácora digital.', features: ['Filtro por período, aeronave o piloto', 'Total de horas por aeronave', 'Logo corporativo y tu código de formato'] },
  { icon: 'bateria', title: 'Registro de Baterías', desc: 'Estado de cada batería con número de serie, ciclos acumulados, historial de intervenciones y estado actual. Esencial para inspecciones técnicas.', features: ['Ciclos por batería con historial', 'Estado: Operativa / Retirada', 'Eventos de inflamiento registrados'] },
  { icon: 'persona', title: 'Bitácora de Piloto', desc: 'Libro de vuelo individual por tripulante con todas las operaciones realizadas, horas totales y validez de certificados médico y de piloto.', features: ['Horas totales por piloto', 'Vigencia de médico aeronáutico', 'Misiones por aeronave'] },
  { icon: 'riesgo', title: 'Solicitud de Autorización', desc: 'Formato de autorización de vuelo con datos de aeronave, tripulación certificada, zona de operación, póliza vigente y firma digital.', features: ['Coordenadas del polígono', 'Póliza RC vinculada', 'Listo para radicar ante UAEAC'] },
];

export default function ReportesClient({ faqItems }) {
  const heroRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ctx;
    if (!prefersReduced) {
      ctx = gsap.context(() => {
        gsap.from('.rp-hero-eyebrow, .rp-hero-title, .rp-hero-sub, .rp-hero-cta, .rp-hero-note', {
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

      {/* HERO — foto real: reporte impreso con gráficas */}
      <section ref={heroRef} className="relative isolate min-h-[80vh] flex items-center overflow-hidden">
        <Image
          src="/screenshots/marketing/hero-reportes-documento.jpg"
          alt="Reporte impreso con gráficas de barras y circular sobre un escritorio"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[35%_55%] -z-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/35 -z-10" />

        <div className="relative max-w-6xl mx-auto px-6 w-full py-24">
          <div className="max-w-2xl">
            <p className="rp-hero-eyebrow inline-flex items-center gap-2 bg-white/10 backdrop-blur text-primary-200 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">
              Reportes 100% personalizables
            </p>
            <h1 className="rp-hero-title text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mt-5">
              Reportes y Auditoría <span className="text-primary-300">AeroCivil</span> en Segundos
            </h1>
            <p className="rp-hero-sub text-base md:text-lg text-navy-100 max-w-xl mt-5">
              Exporta los reportes que exige la RAC 100 con logo corporativo y tu propio código
              de formato. Auditorías sin sorpresas, inspecciones sin papeles perdidos.
            </p>
            <div className="rp-hero-cta flex flex-col sm:flex-row items-center gap-3 mt-8">
              <a href="/registro">
                <Button variant="primary" className="px-8 py-3.5 text-sm">
                  Comenzar gratis
                </Button>
              </a>
              <a href="/rac-100" className="text-sm font-semibold text-white/90 hover:text-white underline underline-offset-4 px-2 py-3.5">
                Ver cumplimiento RAC 100 →
              </a>
            </div>
            <p className="rp-hero-note text-xs text-navy-200 mt-4">
              PDF en segundos · Logo corporativo · Tu código de formato
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
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Listo para auditoría</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Exporta tus reportes <span className="text-primary-600">RAC 100</span> en un clic
            </h2>
            <p className="text-sm text-navy-300 mt-2 max-w-lg mx-auto">
              Maestro de Vuelo, Registro de Baterías y Bitácora de Piloto en PDF con tu logo,
              tu código de formato y versión.
            </p>
          </div>
          <div className="reveal-fade relative aspect-[1568/718] rounded-3xl overflow-hidden border border-navy-100 shadow-xl bg-white p-3 sm:p-4">
            <Image
              src="/screenshots/reportes.jpg"
              alt="Pantalla de Reportes de Bitafly con formatos RAC 100"
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-contain rounded-xl"
            />
          </div>
        </div>
      </section>

      {/* REPORTES */}
      <section className="py-16 md:py-20 px-6 bg-navy">
        <div className="max-w-5xl mx-auto">
          <div className="reveal-fade text-center mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-300">Reportes RAC 100</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
              Cada registro que exige <span className="text-primary-300">la AeroCivil</span>
            </h2>
            <p className="text-sm text-navy-200 mt-3 max-w-lg mx-auto">
              Los códigos de formato no son oficiales de la AeroCivil: cada operador los define
              en su manual de operaciones. En Bitafly vienen por defecto y los personalizas.
            </p>
          </div>
          <div className="reveal-stagger grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto mt-10">
            {REPORTS.map((r) => (
              <div key={r.title} className="bg-white/[0.06] border border-white/10 rounded-2xl p-6">
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary-300 flex items-center justify-center mb-4">
                  <FeatureIcon name={r.icon} className="w-5 h-5" />
                </div>
                <p className="font-bold text-white text-sm mb-2">{r.title}</p>
                <p className="text-sm text-navy-200 leading-relaxed mb-3">{r.desc}</p>
                <ul className="space-y-1.5">
                  {r.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-navy-300">
                      <span className="w-1 h-1 rounded-full bg-primary-300 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 px-6 bg-navy-50">
        <div className="max-w-3xl mx-auto">
          <div className="reveal-fade text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Reportes — Preguntas</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Todo sobre los <span className="text-primary-600">reportes RAC 100</span>
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
      <section className="relative isolate overflow-hidden py-24 px-6 bg-navy text-center">
        <div className="reveal-fade max-w-xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-white">
            Auditoría lista en <span className="text-primary-300">menos de 60 segundos</span>
          </h2>
          <p className="text-sm text-navy-100 mt-3">
            Todos los reportes que exige la RAC 100 generados automáticamente desde tus datos de operación.
          </p>
          <a href="/registro" className="inline-block mt-6">
            <Button variant="primary" className="px-8 py-3.5 text-sm">
              Comenzar gratis
            </Button>
          </a>
        </div>
      </section>

      <PublicFooter brandDesc="Reportes RAC 100 para operadores UAS en Colombia, con tu propio código de formato." />
    </div>
  );
}
