'use client';

// SMS Aeronáutico — reconstruida en el lenguaje visual nuevo. Foto de hero
// nueva: piloto haciendo la verificación pre-vuelo con el dron y el control
// en mano, real, verificada visualmente. El mockup ficticio de "eventos SMS
// recientes" con IDs inventados (SMS-2025-003, etc.) se retiró del hero
// (regla V1) — el dato real vive en "En acción" con el screenshot real
// /screenshots/seguridad-sms.jpg.

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@skylog/ui';
import gsap from 'gsap';
import PublicHeader from '@/components/bitafly/PublicHeader';
import PublicFooter from '@/components/bitafly/PublicFooter';
import { FeatureIcon } from '@/components/bitafly/icons';

const TRUST_STATS = [
  { value: '8', label: 'Módulos SMS integrados' },
  { value: '100', label: 'Preguntas de autoevaluación GAP' },
  { value: '3', label: 'Niveles de clasificación' },
  { value: 'RAC 100', label: 'Cumplimiento normativo' },
];

// Los 8 componentes reales del SMS de Bitafly (ver docs/plan-mejora-sms-bitafly.md
// y CLAUDE.md "Plan de mejora SMS") — SORA queda fuera de esta grilla porque ya
// tiene su propia página dedicada (/sora), enlazada aparte más abajo.
const ECOSYSTEM = [
  {
    icon: 'riesgo',
    title: 'Evaluación de Riesgos',
    desc: 'Matriz 5×5 de probabilidad × gravedad personalizable por organización (semilla OACI Doc 9859), tabla de tolerabilidad editable y registro de peligros con mitigación documentada.',
  },
  {
    icon: 'radar',
    title: 'Indicadores de Seguridad (SPI)',
    desc: 'Catálogo de indicadores con datos mensuales, línea base y líneas de alerta calculadas automáticamente (promedio + desviación estándar del año anterior), con planes de acción por indicador.',
  },
  {
    icon: 'sparkle',
    title: 'Mejora Continua (GAP)',
    desc: 'Autoevaluación del Apéndice 1 completo: 4 componentes, 12 elementos, 100 preguntas Sí/No, con responsable, plazo y comparativo automático entre evaluaciones.',
  },
  {
    icon: 'bolt',
    title: 'Acciones Correctivas',
    desc: 'Tablero único que agrupa hallazgos de 3 fuentes reales: casos SMS/VOR/MOR, planes de acción de indicadores SPI y hallazgos de la autoevaluación GAP — sin duplicar el registro.',
  },
  {
    icon: 'reportes',
    title: 'Reportes de Seg. Operacional',
    desc: 'Seguimiento del plazo de radicación ante la AeroCivil por cada caso VOR/MOR — 5 días hábiles regulatorios para MOR, con recordatorio automático antes de vencer.',
  },
  {
    icon: 'lock',
    title: 'Barreras de Seguridad',
    desc: 'Catálogo real de mitigaciones y controles: categoría, riesgo que atiende, responsable y estado — vinculable a una evaluación SORA o a un caso abierto.',
  },
  {
    icon: 'capacitacion',
    title: 'Capacitación SMS',
    desc: 'Cronograma con recurrencia (semanal, quincenal, mensual o personalizada) y registro de asistencia de todo el personal, no solo pilotos.',
  },
  {
    icon: 'bitacora',
    title: 'Reportes VOR / MOR',
    desc: 'Formularios públicos de Voluntary y Mandatory Occurrence Report, con severidad autoevaluada por el reportante, barrera relacionada y gestión completa del caso hasta el cierre.',
  },
];

const CAMPOS = [
  { icon: 'riesgo', title: 'Clasificación de Eventos', desc: 'Tres niveles según la RAC 100: Incidente, Incidente Grave y Accidente. Cada categoría tiene un flujo de documentación específico con campos obligatorios.' },
  { icon: 'bitacora', title: 'Narrativa Detallada', desc: 'Descripción libre del evento con campos estructurados: aeronave involucrada, piloto, condiciones meteorológicas, fase de vuelo y descripción del evento.' },
  { icon: 'sms', title: 'Acciones Correctivas', desc: 'Registro de acciones correctivas y preventivas con responsable asignado, fecha límite y estado de implementación. Cierre formal del evento documentado.' },
  { icon: 'radar', title: 'Análisis de Tendencias', desc: 'Visualización de eventos por tipo, aeronave, piloto y período. Identifica patrones de riesgo antes de que se conviertan en incidentes graves.' },
  { icon: 'roles', title: 'Roles de Acceso', desc: 'El Gerente SMS tiene acceso completo. Los pilotos reportan eventos. El administrador revisa y cierra. Flujo de aprobación configurable por organización.' },
  { icon: 'reportes', title: 'Reportes para Auditoría', desc: 'Exporta el historial completo de eventos SMS en PDF o Excel. Con logo corporativo, código de formato y versión. Listo para inspecciones de la AeroCivil.' },
];

export default function SmsClient({ faqItems }) {
  const heroRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ctx;
    if (!prefersReduced) {
      ctx = gsap.context(() => {
        gsap.from('.sm-hero-eyebrow, .sm-hero-title, .sm-hero-sub, .sm-hero-cta, .sm-hero-note', {
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

      {/* HERO — foto real: piloto en verificación pre-vuelo */}
      <section ref={heroRef} className="relative isolate min-h-[80vh] flex items-center overflow-hidden">
        <Image
          src="/screenshots/marketing/hero-sms-prevuelo.jpg"
          alt="Piloto haciendo la verificación pre-vuelo con el dron y el control en mano"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_30%] -z-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/35 -z-10" />

        <div className="relative max-w-6xl mx-auto px-6 w-full py-24">
          <div className="max-w-2xl">
            <p className="sm-hero-eyebrow inline-flex items-center gap-2 bg-white/10 backdrop-blur text-primary-200 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">
              SMS · Seguridad Operacional RAC 100
            </p>
            <h1 className="sm-hero-title text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mt-5">
              SMS Aeronáutico para <span className="text-primary-300">Operadores UAS</span>
            </h1>
            <p className="sm-hero-sub text-base md:text-lg text-navy-100 max-w-xl mt-5">
              Un SMS completo, no un formulario suelto: evaluación de riesgos, indicadores de
              desempeño (SPI), autoevaluación GAP, acciones correctivas, barreras, capacitación
              y reportes VOR/MOR — todo integrado y listo para auditorías de la AeroCivil.
            </p>
            <div className="sm-hero-cta flex flex-col sm:flex-row items-center gap-3 mt-8">
              <a href="/registro">
                <Button variant="primary" className="px-8 py-3.5 text-sm">
                  Comenzar gratis
                </Button>
              </a>
              <a href="/rac-100" className="text-sm font-semibold text-white/90 hover:text-white underline underline-offset-4 px-2 py-3.5">
                Ver cumplimiento RAC 100 →
              </a>
            </div>
            <p className="sm-hero-note text-xs text-navy-200 mt-4">
              SMS incluido en todos los planes · Auditorías sin sorpresas
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
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Seguridad operacional</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Clasifica cada <span className="text-primary-600">evento</span> de seguridad
            </h2>
            <p className="text-sm text-navy-300 mt-2 max-w-lg mx-auto">
              Registra incidentes, eventos graves y accidentes con su narrativa, acciones
              correctivas y seguimiento. El SMS queda documentado y listo para auditoría.
            </p>
          </div>
          <div className="reveal-fade relative aspect-[1568/718] rounded-3xl overflow-hidden border border-navy-100 shadow-xl bg-white p-3 sm:p-4">
            <Image
              src="/screenshots/seguridad-sms.jpg"
              alt="Hub de Seguridad SMS de Bitafly"
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-contain rounded-xl"
            />
          </div>
        </div>
      </section>

      {/* ECOSISTEMA — los 8 componentes reales del SMS */}
      <section className="py-16 md:py-20 px-6 bg-navy">
        <div className="max-w-5xl mx-auto">
          <div className="reveal-fade text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-300">Un SMS completo</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
              8 componentes, <span className="text-primary-300">una sola plataforma</span>
            </h2>
            <p className="text-sm text-navy-200 mt-3 max-w-lg mx-auto">
              El Sistema de Gestión de Seguridad Operacional no es un formulario de reportes:
              es un ciclo completo de identificación, medición, mejora y evidencia, alineado
              con las circulares de la AeroCivil para explotadores UAS.
            </p>
          </div>
          <div className="reveal-stagger grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ECOSYSTEM.map((item) => (
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
          <p className="reveal-fade text-center text-xs text-navy-300 mt-8">
            ¿Necesitas evaluar el riesgo de una misión específica antes de volar?{' '}
            <a href="/sora" className="text-primary-300 font-bold hover:text-primary-200">Conoce el análisis SORA →</a>
            {' '}· ¿Buscas el examen calificado que bloquea el despacho?{' '}
            <a href="/capacitacion-drones" className="text-primary-300 font-bold hover:text-primary-200">Ver Capacitación →</a>
          </p>
        </div>
      </section>

      {/* CAMPOS — flujo de un reporte SMS individual */}
      <section className="py-16 md:py-20 px-6 bg-navy-50">
        <div className="max-w-5xl mx-auto">
          <div className="reveal-fade text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Reportes SMS</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Seguridad operacional <span className="text-primary-600">documentada y trazable</span>
            </h2>
          </div>
          <div className="reveal-stagger grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CAMPOS.map((item) => (
              <div
                key={item.title}
                className="bg-white border border-navy-100 rounded-2xl p-5 hover:border-primary-300 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mb-3">
                  <FeatureIcon name={item.icon} className="w-5 h-5" />
                </div>
                <p className="font-bold text-navy text-sm">{item.title}</p>
                <p className="text-sm text-navy-300 mt-1.5 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="reveal-fade text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">SMS Aeronáutico — Preguntas</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Todo sobre el <span className="text-primary-600">sistema de seguridad</span>
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
            Tu SMS aeronáutico <span className="text-primary-300">en regla</span> desde hoy
          </h2>
          <p className="text-sm text-navy-100 mt-3">
            Documenta, clasifica y da seguimiento a todos los eventos de seguridad de tu operación UAS.
          </p>
          <a href="/registro" className="inline-block mt-6">
            <Button variant="primary" className="px-8 py-3.5 text-sm">
              Comenzar gratis
            </Button>
          </a>
        </div>
      </section>
    </div>
  );
}
