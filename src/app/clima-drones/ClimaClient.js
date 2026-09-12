'use client';

// Clima y Meteorología para Drones — reconstruida en el lenguaje visual
// nuevo. Foto de hero nueva: silueta de dron real contra un cielo dramático
// al atardecer, verificada visualmente — reemplaza el `WeatherScene` SVG que
// vivía en el hero (se mantiene solo el screenshot real en "En acción").

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@skylog/ui';
import gsap from 'gsap';
import PublicHeader from '@/components/bitafly/PublicHeader';
import PublicFooter from '@/components/bitafly/PublicFooter';
import { FeatureIcon } from '@/components/bitafly/icons';

const TRUST_STATS = [
  { value: '0-100', label: 'Score de aptitud' },
  { value: '6', label: 'Variables evaluadas' },
  { value: 'Kp', label: 'Fiabilidad del GPS' },
  { value: '0', label: 'Apps que instalar' },
];

const MEASURES = [
  { icon: 'clima', title: 'Viento a 10 m', desc: 'Velocidad del viento en superficie. Umbral por defecto de 25 km/h; por encima, el vuelo se marca como no apto.' },
  { icon: 'bolt', title: 'Ráfagas', desc: 'Las ráfagas, no el viento medio, son las que desestabilizan al dron. Umbral por defecto de 35 km/h.' },
  { icon: 'radar', title: 'Visibilidad', desc: 'Distancia visual horizontal. Crítica para mantener la línea de vista (VLOS). Umbral por defecto de 5 km.' },
  { icon: 'clima', title: 'Lluvia y probabilidad', desc: 'Precipitación actual y probabilidad de lluvia en la hora del vuelo. La mayoría de UAS no son resistentes al agua.' },
  { icon: 'nube', title: 'Índice Kp · GPS', desc: 'Actividad geomagnética (NOAA). Un Kp alto degrada la señal GPS. Se clasifica como óptimo, degradado o no confiable.' },
  { icon: 'replay', title: 'Histórico del vuelo', desc: 'Condiciones exactas al momento de un vuelo ya realizado, visibles en el replay para análisis post-operación.' },
];

const WEIGHTS = [
  { label: 'Viento a 10 m', pct: 30 },
  { label: 'Ráfagas', pct: 22 },
  { label: 'Visibilidad', pct: 22 },
  { label: 'Precipitación', pct: 16 },
  { label: 'Probabilidad de lluvia', pct: 5 },
  { label: 'Índice Kp (GPS)', pct: 5 },
];

const COMPARE = [
  { feature: 'Score de aptitud de vuelo 0-100', bitafly: true, rival: true },
  { feature: 'Viento, ráfagas, visibilidad y lluvia', bitafly: true, rival: true },
  { feature: 'Índice Kp / fiabilidad del GPS', bitafly: true, rival: true },
  { feature: 'Integrado en la programación de la misión', bitafly: true, rival: false },
  { feature: 'Badge APTO / NO APTO al despachar el vuelo', bitafly: true, rival: false },
  { feature: 'Queda registrado junto al vuelo (replay y bitácora)', bitafly: true, rival: false },
  { feature: 'Umbrales y enfoque RAC 100 · Colombia', bitafly: true, rival: false },
  { feature: 'Sin instalar una app aparte', bitafly: true, rival: false },
];

function CheckMark({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={`w-4 h-4 inline-block ${className}`} fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ClimaClient({ faqItems }) {
  const heroRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ctx;
    if (!prefersReduced) {
      ctx = gsap.context(() => {
        gsap.from('.cl-hero-eyebrow, .cl-hero-title, .cl-hero-sub, .cl-hero-cta, .cl-hero-note', {
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

      {/* HERO — foto real: silueta de dron contra cielo dramático */}
      <section ref={heroRef} className="relative isolate min-h-[80vh] flex items-center overflow-hidden">
        <Image
          src="/screenshots/marketing/hero-clima-cielo.jpg"
          alt="Silueta de un dron volando contra un cielo con nubes al atardecer"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[40%_50%] -z-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/35 -z-10" />

        <div className="relative max-w-6xl mx-auto px-6 w-full py-24">
          <div className="max-w-2xl">
            <p className="cl-hero-eyebrow inline-flex items-center gap-2 bg-white/10 backdrop-blur text-primary-200 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">
              Verificación pre-vuelo · RAC 100
            </p>
            <h1 className="cl-hero-title text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mt-5">
              Clima y Meteorología para <span className="text-primary-300">Drones</span> antes de cada vuelo
            </h1>
            <p className="cl-hero-sub text-base md:text-lg text-navy-100 max-w-xl mt-5">
              Viento, ráfagas, visibilidad, lluvia e índice Kp para la fiabilidad del GPS,
              resumidos en un score de aptitud de 0 a 100. Integrado en tu operación, no una
              app aparte.
            </p>
            <div className="cl-hero-cta flex flex-col sm:flex-row items-center gap-3 mt-8">
              <a href="/registro">
                <Button variant="primary" className="px-8 py-3.5 text-sm">
                  Comenzar gratis
                </Button>
              </a>
              <a href="#comparativa" className="text-sm font-semibold text-white/90 hover:text-white underline underline-offset-4 px-2 py-3.5">
                Bitafly vs. app de clima →
              </a>
            </div>
            <p className="cl-hero-note text-xs text-navy-200 mt-4">
              Datos de Open-Meteo + NOAA · sin API key · sin costo extra
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
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">En el flujo de trabajo</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              El clima <span className="text-primary-600">donde tomas la decisión</span>
            </h2>
            <p className="text-sm text-navy-300 mt-2 max-w-lg mx-auto">
              No es un sitio web que abres aparte: la verificación meteorológica aparece dentro
              de Bitafly, justo cuando programas, despachas y revisas el vuelo.
            </p>
          </div>
          <div className="reveal-fade relative aspect-[1568/718] rounded-3xl overflow-hidden border border-navy-100 shadow-xl bg-white p-3 sm:p-4">
            <Image
              src="/screenshots/meteorologia.jpg"
              alt="Pantalla de Meteorología de Bitafly con viento, ráfagas y pronóstico horario"
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-contain rounded-xl"
            />
          </div>
        </div>
      </section>

      {/* QUÉ MIDE */}
      <section className="py-16 md:py-20 px-6 bg-navy">
        <div className="max-w-5xl mx-auto">
          <div className="reveal-fade text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-300">Qué evalúa</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
              Las variables que <span className="text-primary-300">sí importan</span> para volar
            </h2>
          </div>
          <div className="reveal-stagger grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MEASURES.map((m) => (
              <div
                key={m.title}
                className="bg-white/[0.06] border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-primary-400/40 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary-300 flex items-center justify-center mb-3">
                  <FeatureIcon name={m.icon} className="w-5 h-5" />
                </div>
                <p className="font-bold text-white text-sm">{m.title}</p>
                <p className="text-sm text-navy-200 mt-1.5 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO SE CALCULA */}
      <section className="py-16 md:py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="reveal-fade">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Cómo se calcula</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Un <span className="text-primary-600">score</span>, no veinte cifras sueltas
            </h2>
            <p className="text-sm text-navy-300 mt-3 leading-relaxed">
              Bitafly pondera cada variable según su impacto real en el vuelo y devuelve un solo
              número de 0 a 100 con su semáforo.
            </p>
            <div className="flex flex-col gap-3 mt-5">
              {WEIGHTS.map((w) => (
                <div key={w.label} className="flex items-center gap-3">
                  <span className="w-36 text-xs font-bold text-navy-400 shrink-0">{w.label}</span>
                  <div className="flex-1 h-2.5 bg-navy-50 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${w.pct * 3.3}%` }} />
                  </div>
                  <span className="w-10 text-right text-xs font-black text-navy">{w.pct}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-navy rounded-3xl p-8 text-white">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary-300 mb-4">Umbrales por defecto</p>
            {[
              { k: 'Viento', v: '25 km/h' },
              { k: 'Ráfagas', v: '35 km/h' },
              { k: 'Visibilidad', v: '5 km' },
              { k: 'Precipitación', v: '0.1 mm/h' },
            ].map((t, i) => (
              <div key={t.k} className={`flex justify-between items-center py-3.5 ${i !== 0 ? 'border-t border-white/10' : ''}`}>
                <span className="text-sm text-navy-200">{t.k}</span>
                <span className="text-sm font-black font-mono text-white">{t.v}</span>
              </div>
            ))}
            <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-2xl">
              <p className="text-xs font-bold text-primary-300 mb-1">Configurables por organización</p>
              <p className="text-xs text-navy-200 leading-relaxed">Ajusta los límites según tu manual de operaciones y el tipo de aeronave.</p>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARATIVA */}
      <section id="comparativa" className="py-16 md:py-20 px-6 bg-navy-50">
        <div className="max-w-3xl mx-auto">
          <div className="reveal-fade text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Clima integrado vs. app aparte</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Bitafly Clima vs. una <span className="text-primary-600">app de clima</span>
            </h2>
            <p className="text-sm text-navy-300 mt-2 max-w-lg mx-auto">
              Las apps de meteorología para drones muestran buenas variables, pero viven
              aisladas. El clima de Bitafly nace dentro de la plataforma que ya gestiona tu
              operación y tu cumplimiento.
            </p>
          </div>
          <div className="reveal-fade bg-white border border-navy-100 rounded-3xl overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_90px] bg-navy text-white">
              <div className="px-4 py-4 text-[11px] font-bold uppercase tracking-wide">Capacidad</div>
              <div className="px-2 py-4 text-center text-[10px] font-bold uppercase text-primary-300">Bitafly</div>
              <div className="px-2 py-4 text-center text-[10px] font-bold uppercase text-navy-300 leading-tight">App aislada</div>
            </div>
            {COMPARE.map((row, i) => (
              <div key={row.feature} className={`grid grid-cols-[1fr_80px_90px] border-t border-navy-100 ${i % 2 ? 'bg-navy-50' : 'bg-white'}`}>
                <div className="px-4 py-3.5 text-sm text-navy-500">{row.feature}</div>
                <div className="py-3.5 text-center">
                  {row.bitafly ? <CheckMark className="text-green-500" /> : <span className="text-navy-200 text-sm">—</span>}
                </div>
                <div className="py-3.5 text-center">
                  {row.rival ? <CheckMark className="text-navy-300" /> : <span className="text-navy-200 text-sm">—</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="reveal-fade text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Preguntas frecuentes</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Clima para <span className="text-primary-600">drones</span>, sin vueltas
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
            Decide cada vuelo con <span className="text-primary-300">la meteorología</span> de tu lado
          </h2>
          <p className="text-sm text-navy-100 mt-3">
            El clima ya viene dentro de Bitafly, junto a tu bitácora, despacho y cumplimiento RAC 100.
          </p>
          <a href="/registro" className="inline-block mt-6">
            <Button variant="primary" className="px-8 py-3.5 text-sm">
              Comenzar gratis
            </Button>
          </a>
        </div>
      </section>

      <PublicFooter brandDesc="Verificación meteorológica pre-vuelo para operadores UAS en Colombia: viento, visibilidad e índice Kp integrados en la operación." />
    </div>
  );
}
