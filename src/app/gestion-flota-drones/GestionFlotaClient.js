'use client';

// Gestión de Flota — reconstruida en el lenguaje visual nuevo (mismo patrón
// que BitacoraDigitalClient/AutorizacionesClient/SoraClient). Foto de hero
// nueva: varios drones reales en fila sobre una mesa — metáfora directa de
// "gestionar una flota", verificada visualmente antes de integrarla. El
// mockup ficticio de tarjetas de aeronaves con datos inventados se retiró del
// hero (regla V1) — el dato real de producto vive en la sección "En acción"
// con el screenshot real (/screenshots/flota.jpg).

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@skylog/ui';
import gsap from 'gsap';
import PublicHeader from '@/components/bitafly/PublicHeader';
import PublicFooter from '@/components/bitafly/PublicFooter';
import { FeatureIcon } from '@/components/bitafly/icons';

const TRUST_STATS = [
  { value: '10', label: 'Aeronaves plan Flota' },
  { value: '∞', label: 'Aeronaves Enterprise' },
  { value: '5', label: 'Estados de aeronave' },
  { value: '24/7', label: 'Acceso en la nube' },
];

const CAMPOS = [
  { icon: 'flota', title: 'Registro de Aeronaves', desc: 'Modelo, fabricante, número de serie, matrícula UAEAC, fecha de adquisición y foto. Perfil completo de cada aeronave de la flota.' },
  { icon: 'timer', title: 'Horas Totales en Tiempo Real', desc: 'Cada vuelo registrado suma automáticamente al totalizador de la aeronave. Visualiza las horas en el panel de flota sin cálculos manuales.' },
  { icon: 'mantenimiento', title: 'Estado de Mantenimiento', desc: 'Indicador visual del estado: Operativa, En Mantenimiento, Inactiva. Alerta cuando se acerca a 200 horas o 6 meses del último servicio.' },
  { icon: 'bateria', title: 'Baterías Asignadas', desc: 'Gestión de las baterías LiPo asociadas a cada aeronave con control de ciclos individual. Registro automático en cada vuelo.' },
  { icon: 'persona', title: 'Tripulación Certificada', desc: 'Asignación de pilotos habilitados por aeronave. Verificación automática de certificados vigentes antes de permitir el registro de un vuelo.' },
  { icon: 'reportes', title: 'Análisis de Utilización', desc: 'Reportes de horas voladas por aeronave en el período seleccionado. Identifica aeronaves subutilizadas o sobrecargadas de operación.' },
];

export default function GestionFlotaClient({ faqItems }) {
  const heroRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ctx;
    if (!prefersReduced) {
      ctx = gsap.context(() => {
        gsap.from('.gf-hero-eyebrow, .gf-hero-title, .gf-hero-sub, .gf-hero-cta, .gf-hero-note', {
          opacity: 0,
          y: 16,
          duration: 0.5,
          ease: 'power1.out',
          stagger: 0.08,
        });
        gsap.from('.gf-hero-float', { opacity: 0, y: 10, duration: 0.6, delay: 0.5, ease: 'power2.out' });
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

      {/* HERO — foto real: varios drones en fila sobre una mesa */}
      <section ref={heroRef} className="relative isolate min-h-[80vh] flex items-center overflow-hidden">
        <Image
          src="/screenshots/marketing/hero-flota-lineup.jpg"
          alt="Varios drones DJI en fila sobre una mesa"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_40%] -z-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/35 -z-10" />

        <div className="relative max-w-6xl mx-auto px-6 w-full py-24">
          <div className="max-w-2xl">
            <p className="gf-hero-eyebrow inline-flex items-center gap-2 bg-white/10 backdrop-blur text-primary-200 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">
              Flota · Aeronaves · Tripulación
            </p>
            <h1 className="gf-hero-title text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mt-5">
              Gestión de <span className="text-primary-300">Flota de Drones</span> para Empresas
            </h1>
            <p className="gf-hero-sub text-base md:text-lg text-navy-100 max-w-xl mt-5">
              Registra cada aeronave, controla horas de vuelo acumuladas, monitorea el estado
              operativo y gestiona la tripulación asignada. Todo en una plataforma RAC 100.
            </p>
            <div className="gf-hero-cta flex flex-col sm:flex-row items-center gap-3 mt-8">
              <a href="/registro">
                <Button variant="primary" className="px-8 py-3.5 text-sm">
                  Comenzar gratis
                </Button>
              </a>
              <a href="/mantenimiento-drones" className="text-sm font-semibold text-white/90 hover:text-white underline underline-offset-4 px-2 py-3.5">
                Ver mantenimiento →
              </a>
            </div>
            <p className="gf-hero-note text-xs text-navy-200 mt-4">
              Hasta 10 aeronaves en el plan Flota · Ilimitadas en Enterprise
            </p>
          </div>

          <div className="gf-hero-float hidden lg:block absolute bottom-14 right-6 xl:right-16 w-64 rounded-2xl bg-white/95 backdrop-blur border border-white/40 shadow-2xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-navy-300">Panel de flota</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <p className="text-sm font-bold text-navy">Horas actualizadas en vivo</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <p className="text-xl font-black text-navy">10</p>
                <p className="text-[10px] text-navy-300">Aeronaves (plan Flota)</p>
              </div>
              <div>
                <p className="text-xl font-black text-navy">5</p>
                <p className="text-[10px] text-navy-300">Estados de aeronave</p>
              </div>
            </div>
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
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Visión de flota</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Toda tu <span className="text-primary-600">flota</span> en un solo panel
            </h2>
            <p className="text-sm text-navy-300 mt-2 max-w-lg mx-auto">
              Cada aeronave con sus horas totales, ciclos de batería, estado operativo y próximos
              mantenimientos. Sin hojas de cálculo dispersas: se actualiza solo al registrar cada vuelo.
            </p>
          </div>
          <div className="reveal-fade relative aspect-[1568/718] rounded-3xl overflow-hidden border border-navy-100 shadow-xl bg-white p-3 sm:p-4">
            <Image
              src="/screenshots/flota.jpg"
              alt="Pantalla de Flota de Bitafly con las aeronaves registradas"
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
            <p className="text-xs font-bold uppercase tracking-widest text-primary-300">Módulo de flota</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
              Control total de <span className="text-primary-300">cada aeronave</span>
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
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Gestión de flota — Preguntas</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Todo sobre <span className="text-primary-600">Mi Flota</span>
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
            Tu flota de drones <span className="text-primary-300">organizada y en regla</span>
          </h2>
          <p className="text-sm text-navy-100 mt-2">
            Control de horas, mantenimiento, tripulación y documentación RAC 100 en una sola plataforma.
          </p>
          <a href="/registro" className="inline-block mt-6">
            <Button variant="primary" className="px-8 py-3.5 text-sm">
              Comenzar gratis
            </Button>
          </a>
        </div>
      </section>

      <PublicFooter brandDesc="Gestión de flota de drones para empresas en Colombia con cumplimiento RAC 100." />
    </div>
  );
}
