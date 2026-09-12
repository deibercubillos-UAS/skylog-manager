'use client';

// Replay GPS — reconstruida en el lenguaje visual nuevo (mismo patrón que
// las demás páginas migradas). Foto de hero nueva: dron DJI Phantom en pleno
// vuelo al atardecer — metáfora directa de "revive el vuelo", verificada
// visualmente. El mockup SVG fabricado del panel de replay (con datos
// inventados: "118 m", "9.4 m/s", joysticks simulados) se retiró del hero
// (regla V1) — el dato real de producto vive en el spotlight con el
// screenshot real /screenshots/replay-gps-upload.jpg.

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@skylog/ui';
import gsap from 'gsap';
import PublicHeader from '@/components/bitafly/PublicHeader';
import PublicFooter from '@/components/bitafly/PublicFooter';
import { FeatureIcon } from '@/components/bitafly/icons';

const TRUST_STATS = [
  { value: 'GPS', label: 'Ruta cuadro a cuadro' },
  { value: '5+', label: 'Variables de telemetría' },
  { value: 'DJI', label: 'RC / RC 2 compatible' },
  { value: '0', label: 'Software a instalar' },
];

const FEATURES = [
  { icon: 'mapa', title: 'Ruta GPS Animada', desc: 'La trayectoria completa del vuelo dibujada sobre el mapa, con punto de despegue y la posición del dron avanzando cuadro a cuadro.' },
  { icon: 'timer', title: 'Telemetría Sincronizada', desc: 'Altitud, velocidad, distancia recorrida y tiempo de vuelo actualizados en cada instante del replay.' },
  { icon: 'roles', title: 'Joysticks del Control', desc: 'Reproducción de los movimientos de los sticks del DJI RC/RC 2 en tiempo real. Ideal para capacitación.' },
  { icon: 'bateria', title: 'Curva de Batería', desc: 'El nivel de batería a lo largo del vuelo, sincronizado con la ruta. Detecta consumos anómalos.' },
  { icon: 'nube', title: 'Importación DJI Automática', desc: 'Sube el .txt del control DJI RC o RC 2 y Bitafly reconstruye todo en segundos, sin software de escritorio.' },
  { icon: 'sms', title: 'Evidencia para SMS y Auditoría', desc: 'Adjunta el replay a un reporte de incidente o a una inspección de la AeroCivil.' },
];

const USE_CASES = [
  { icon: 'riesgo', title: 'Investigación de incidentes', desc: 'Reconstruye qué pasó antes de un evento: altura, velocidad, batería y maniobras del piloto.' },
  { icon: 'capacitacion', title: 'Capacitación de pilotos', desc: 'Revisa los vuelos con tu equipo y corrige técnica sobre evidencia real, no sobre recuerdos.' },
  { icon: 'lock', title: 'Verificación de cumplimiento', desc: 'Comprueba que la operación se mantuvo dentro de la zona y la altitud autorizadas.' },
  { icon: 'sparkle', title: 'Reporte al cliente', desc: 'Demuestra el área cubierta y la ejecución del trabajo con una reproducción visual del vuelo.' },
];

const STEPS = [
  { n: '1', t: 'Copia el registro del control', d: 'Conecta tu DJI RC o RC 2 y copia la carpeta FlightRecord al computador (o usa el .txt del vuelo).' },
  { n: '2', t: 'Súbelo desde la bitácora', d: 'En el vuelo registrado pulsa Replay y arrastra el archivo .txt. Bitafly lo procesa en el navegador en segundos.' },
  { n: '3', t: 'Reproduce y analiza', d: 'Avanza, pausa y retrocede el vuelo cuadro a cuadro. Revisa ruta, altitud, velocidad, batería y joysticks.' },
];

const PLANS = [
  { plan: 'Piloto', flights: '10 replays', retention: '30 días', featured: false },
  { plan: 'Escuadrilla', flights: '50 replays', retention: '90 días', featured: false },
  { plan: 'Flota', flights: '200 replays', retention: '180 días', featured: true },
  { plan: 'Enterprise', flights: 'Ilimitados', retention: 'Permanente', featured: false },
];

export default function ReplayClient({ faqItems }) {
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

      {/* HERO — foto real: DJI Phantom en pleno vuelo al atardecer */}
      <section ref={heroRef} className="relative isolate min-h-[80vh] flex items-center overflow-hidden">
        <Image
          src="/screenshots/marketing/hero-replay-vuelo.jpg"
          alt="Dron DJI Phantom en pleno vuelo al atardecer"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_35%] -z-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/35 -z-10" />

        <div className="relative max-w-6xl mx-auto px-6 w-full py-24">
          <div className="max-w-2xl">
            <p className="rp-hero-eyebrow inline-flex items-center gap-2 bg-white/10 backdrop-blur text-primary-200 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">
              Replay GPS · Telemetría DJI
            </p>
            <h1 className="rp-hero-title text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mt-5">
              Reproduce el Vuelo <span className="text-primary-300">Cuadro a Cuadro</span>
            </h1>
            <p className="rp-hero-sub text-base md:text-lg text-navy-100 max-w-xl mt-5">
              Vuelve a ver cada operación dibujada sobre el mapa: ruta GPS, altitud, velocidad,
              batería y joysticks del control en tiempo real. Importa el log del DJI RC/RC 2 y
              analiza el vuelo como si estuvieras ahí.
            </p>
            <div className="rp-hero-cta flex flex-col sm:flex-row items-center gap-3 mt-8">
              <a href="/registro">
                <Button variant="primary" className="px-8 py-3.5 text-sm">
                  Reproducir mi vuelo
                </Button>
              </a>
              <a href="/bitacora-digital" className="text-sm font-semibold text-white/90 hover:text-white underline underline-offset-4 px-2 py-3.5">
                Ver bitácora digital →
              </a>
            </div>
            <p className="rp-hero-note text-xs text-navy-200 mt-4">
              Desde el log del DJI RC/RC 2 · Sin software de escritorio · Sin tarjeta de crédito
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
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Análisis post-vuelo</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Reproduce cada vuelo <span className="text-primary-600">cuadro a cuadro</span>
            </h2>
            <p className="text-sm text-navy-300 mt-2 max-w-lg mx-auto">
              Importa el log del DJI RC y revive la operación sobre el mapa: ruta GPS, altitud,
              velocidad, batería y los joysticks del control, segundo a segundo.
            </p>
          </div>
          <div className="reveal-fade relative aspect-[1568/718] rounded-3xl overflow-hidden border border-navy-100 shadow-xl bg-white p-3 sm:p-4">
            <Image
              src="/screenshots/replay-gps-upload.jpg"
              alt="Pantalla de carga del Replay GPS de Bitafly"
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-contain rounded-xl"
            />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-16 md:py-20 px-6 bg-navy">
        <div className="max-w-5xl mx-auto">
          <div className="reveal-fade text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-300">Qué reconstruye</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
              Tu vuelo, <span className="text-primary-300">de vuelta en pantalla</span>
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

      {/* CÓMO FUNCIONA + CASOS DE USO */}
      <section className="py-16 md:py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-start">
          <div className="reveal-fade">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">En 3 pasos</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              De tu control DJI <span className="text-primary-600">al replay</span>
            </h2>
            <div className="flex flex-col gap-5 mt-6">
              {STEPS.map((step) => (
                <div key={step.n} className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm shrink-0">{step.n}</div>
                  <div>
                    <p className="font-bold text-navy text-sm">{step.t}</p>
                    <p className="text-sm text-navy-300 mt-0.5 leading-relaxed">{step.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="reveal-stagger grid sm:grid-cols-2 gap-3">
            {USE_CASES.map((uc) => (
              <div key={uc.title} className="bg-navy-50 border border-navy-100 rounded-2xl p-5">
                <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mb-3">
                  <FeatureIcon name={uc.icon} className="w-5 h-5" />
                </div>
                <p className="font-bold text-navy text-sm">{uc.title}</p>
                <p className="text-sm text-navy-300 mt-1.5 leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RETENCIÓN POR PLAN */}
      <section className="py-16 md:py-20 px-6 bg-navy-50">
        <div className="max-w-5xl mx-auto">
          <div className="reveal-fade text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Almacenamiento en la nube</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Replays guardados <span className="text-primary-600">según tu plan</span>
            </h2>
            <p className="text-sm text-navy-300 mt-2 max-w-lg mx-auto">
              Los replays se almacenan cifrados y se sirven con enlaces firmados temporales. La
              cantidad y el tiempo de retención crecen con tu plan.
            </p>
          </div>
          <div className="reveal-stagger grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((p) => (
              <div
                key={p.plan}
                className={`relative rounded-2xl p-6 border ${p.featured ? 'bg-navy border-primary' : 'bg-white border-navy-100'}`}
              >
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-bold uppercase tracking-wide px-3 py-1 rounded-full whitespace-nowrap">
                    Más popular
                  </span>
                )}
                <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${p.featured ? 'text-primary-300' : 'text-navy-300'}`}>{p.plan}</p>
                <p className={`text-2xl font-black mb-1 ${p.featured ? 'text-white' : 'text-navy'}`}>{p.flights}</p>
                <p className={`text-xs ${p.featured ? 'text-navy-200' : 'text-navy-400'}`}>
                  Retención: <strong className={p.featured ? 'text-white' : 'text-navy'}>{p.retention}</strong>
                </p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-navy-300 mt-6">
            La limpieza de replays vencidos es automática. Consulta los detalles en{' '}
            <a href="/precios" className="text-primary-600 font-bold">planes y precios →</a>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="reveal-fade text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Replay GPS — Preguntas</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Todo sobre el <span className="text-primary-600">replay de vuelo</span>
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
            Vuelve a volar <span className="text-primary-300">cada misión</span>
          </h2>
          <p className="text-sm text-navy-100 mt-3">
            Sube el log de tu DJI y reproduce el vuelo cuadro a cuadro. Disponible en todos los planes.
          </p>
          <a href="/registro" className="inline-block mt-6">
            <Button variant="primary" className="px-8 py-3.5 text-sm">
              Comenzar gratis
            </Button>
          </a>
        </div>
      </section>

      <PublicFooter brandDesc="Replay GPS de vuelo para operadores UAS en Colombia. Reproduce la ruta, la telemetría y los joysticks desde el log del DJI RC/RC 2." />
    </div>
  );
}
