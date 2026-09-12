'use client';

// Zona de operación y KML — reconstruida en el lenguaje visual nuevo.
// CORRECCIÓN DE FONDO (confirmada con el usuario vía AskUserQuestion): la
// herramienta "Planear Vuelo" independiente ya NO existe en el producto
// (CLAUDE.md, 2026-07-20 — /dashboard/plan-vuelo redirige a TODOS los
// usuarios, nadie puede crear planeaciones nuevas ahí). El dibujo de zona +
// exportar KML/PDF sigue siendo real, pero hoy vive DENTRO de Programación
// (BasicForm.js, al programar una misión) — el copy se reescribió para
// reflejar eso, en vez de anunciar una herramienta standalone que no existe
// (regla V1). Foto de hero nueva: piloto real con tablet DJI mostrando
// altitud/coordenadas en terreno abierto, verificada visualmente.

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@skylog/ui';
import gsap from 'gsap';
import PublicHeader from '@/components/bitafly/PublicHeader';
import PublicFooter from '@/components/bitafly/PublicFooter';
import { FeatureIcon } from '@/components/bitafly/icons';

const TRUST_STATS = [
  { value: 'KML/KMZ', label: 'Exportación compatible' },
  { value: '3', label: 'Geometrías de zona' },
  { value: 'WGS-84', label: 'Formato AeroCivil' },
  { value: '0', label: 'Software externo' },
];

const CAMPOS = [
  { icon: 'mapa', title: 'Mapa interactivo', desc: 'Dibuja el área de operación directamente sobre el mapa al programar una misión. Cambia entre satélite y mapa según necesites.' },
  { icon: 'riesgo', title: 'Polígono, línea y círculo', desc: 'Tres geometrías para cualquier tipo de operación. El área se cierra automáticamente al completar el polígono.' },
  { icon: 'nube', title: 'Exportar KML y KMZ', desc: 'Descarga el archivo en el formato que necesites. Compatible con el portal AeroCivil y Google Earth.' },
  { icon: 'radar', title: 'Coordenadas precisas', desc: 'Visualiza latitud y longitud de cada punto. Cumple los requisitos de precisión de la AeroCivil.' },
  { icon: 'bitacora', title: 'Vinculado a autorizaciones', desc: 'El área de operación se adjunta directamente a tu solicitud de autorización dentro de Bitafly.' },
  { icon: 'reportes', title: 'Cálculo de área y perímetro', desc: 'Bitafly calcula automáticamente el área en m²/ha y el perímetro en km del área definida.' },
];

export default function PlanVueloClient({ faqItems }) {
  const heroRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ctx;
    if (!prefersReduced) {
      ctx = gsap.context(() => {
        gsap.from('.pv-hero-eyebrow, .pv-hero-title, .pv-hero-sub, .pv-hero-cta, .pv-hero-note', {
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

      {/* HERO — foto real: piloto con tablet DJI en terreno abierto */}
      <section ref={heroRef} className="relative isolate min-h-[80vh] flex items-center overflow-hidden">
        <Image
          src="/screenshots/marketing/hero-planvuelo-mapa.jpg"
          alt="Piloto revisando altitud y coordenadas en la tablet de su control DJI"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[45%_45%] -z-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/35 -z-10" />

        <div className="relative max-w-6xl mx-auto px-6 w-full py-24">
          <div className="max-w-2xl">
            <p className="pv-hero-eyebrow inline-flex items-center gap-2 bg-white/10 backdrop-blur text-primary-200 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">
              Zona de operación · KML · AeroCivil
            </p>
            <h1 className="pv-hero-title text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mt-5">
              Define la Zona y Genera el <span className="text-primary-300">KML para la AeroCivil</span>
            </h1>
            <p className="pv-hero-sub text-base md:text-lg text-navy-100 max-w-xl mt-5">
              Al programar tu misión, dibuja el área de operación en un mapa interactivo y
              genera el archivo KML o KMZ compatible con la AeroCivil — listo para adjuntar
              a tu solicitud de autorización en segundos.
            </p>
            <div className="pv-hero-cta flex flex-col sm:flex-row items-center gap-3 mt-8">
              <a href="/registro">
                <Button variant="primary" className="px-8 py-3.5 text-sm">
                  Comenzar gratis
                </Button>
              </a>
              <a href="/sora" className="text-sm font-semibold text-white/90 hover:text-white underline underline-offset-4 px-2 py-3.5">
                Ver análisis SORA →
              </a>
            </div>
            <p className="pv-hero-note text-xs text-navy-200 mt-4">
              KML compatible con AeroCivil y Google Earth · Funciona en móvil
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

      {/* EN ACCIÓN — screenshot real de Programación */}
      <section className="py-16 md:py-20 px-6 bg-navy-50">
        <div className="max-w-5xl mx-auto">
          <div className="reveal-fade text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Al programar tu misión</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Dibuja la zona y genera el <span className="text-primary-600">KMZ</span>
            </h2>
            <p className="text-sm text-navy-300 mt-2 max-w-lg mx-auto">
              Define el polígono de operación sobre el mapa al crear la misión, fija altitud y
              coordenadas, y descarga el KMZ y el PDF listos para tu tripulación y la AeroCivil.
            </p>
          </div>
          <div className="reveal-fade relative aspect-[1568/718] rounded-3xl overflow-hidden border border-navy-100 shadow-xl bg-white p-3 sm:p-4">
            <Image
              src="/screenshots/programacion.jpg"
              alt="Calendario de Programación de misiones de Bitafly"
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
            <p className="text-xs font-bold uppercase tracking-widest text-primary-300">Zona de operación</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
              Todo lo que necesitas para documentar tu operación
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
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1 text-center">Preguntas sobre la zona de operación y el KML</h2>
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
          <p className="text-xs font-bold uppercase tracking-widest text-primary-300 mb-3">KML en un clic</p>
          <h2 className="text-2xl md:text-3xl font-black text-white">Deja de hacer el KML a mano</h2>
          <p className="text-sm text-navy-100 mt-3">
            Dibuja el área en el mapa al programar tu misión, exporta el KML para la AeroCivil
            y vincula el plan a tu solicitud de autorización. Todo en minutos.
          </p>
          <a href="/registro" className="inline-block mt-6">
            <Button variant="primary" className="px-8 py-3.5 text-sm">
              Comenzar gratis — sin tarjeta
            </Button>
          </a>
        </div>
      </section>

      <PublicFooter brandDesc="Define la zona de operación y genera el KML para la AeroCivil al programar tu misión." />
    </div>
  );
}
