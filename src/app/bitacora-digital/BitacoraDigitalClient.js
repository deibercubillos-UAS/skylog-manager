'use client';

// Bitácora Digital — reconstruida 100% en el lenguaje visual nuevo de
// src/app/preview-bitafly/page.js (Tailwind + @skylog/ui + GSAP + fotos
// reales), NO el frontend viejo (SEONav/SEOFooter/Decor/estilos inline).
// PublicHeader/PublicFooter son los mismos componentes compartidos que usa
// preview-bitafly — ver src/components/bitafly/.
//
// Imágenes: /screenshots/bitacora.jpg es una captura REAL del producto en
// producción (regla V1). El CTA final reutiliza hero-drone.jpg (ya
// verificada para preview-bitafly). El hero usa una foto nueva,
// marketing/hero-bitacora-dji.jpg — control DJI con tablet mostrando
// telemetría en vivo (GPS Mode, altura, distancia) — foto de stock de
// licencia libre (Unsplash, uso comercial sin atribución requerida),
// verificada visualmente antes de integrarla: se eligió justamente porque
// muestra una pantalla con datos de vuelo en vivo, coherente con el mensaje
// de carga/sincronización automática de esta página.

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@skylog/ui';
import gsap from 'gsap';
import PublicHeader from '@/components/bitafly/PublicHeader';
import PublicFooter from '@/components/bitafly/PublicFooter';
import { FeatureIcon } from '@/components/bitafly/icons';

const TRUST_STATS = [
  { value: '∞', label: 'Vuelos registrables' },
  { value: '100%', label: 'Código de formato personalizable' },
  { value: 'PDF', label: 'Exportación instantánea' },
  { value: '0', label: 'Datos en papel' },
];

const CAMPOS = [
  { icon: 'flota', title: 'Aeronave y Matrícula', desc: 'Selección de aeronave registrada con modelo, número de serie y matrícula UAEAC. Vinculación automática a horas totales acumuladas.' },
  { icon: 'persona', title: 'Tripulación y PIC', desc: 'Asignación del Piloto en Comando con verificación de certificado vigente. Validación automática del médico aeronáutico antes del vuelo.' },
  { icon: 'bateria', title: 'Batería Utilizada', desc: 'Registro de batería con número de serie, ciclos acumulados y estado. Alerta automática si supera el umbral de ciclos configurado.' },
  { icon: 'bitacora', title: 'Tiempos de Vuelo', desc: 'Hora de despegue y aterrizaje con cálculo automático del tiempo total. Suma acumulada a las horas de la aeronave y del piloto.' },
  { icon: 'clima', title: 'Condiciones Meteorológicas', desc: 'Registro de clima, visibilidad y viento en el momento de la operación — campo obligatorio de la bitácora según la RAC 100.' },
  { icon: 'timer', title: 'Horas Acumuladas Automáticas', desc: 'Cada vuelo suma automáticamente las horas al totalizador de la aeronave y al libro de vuelo del piloto. Sin cálculos manuales.' },
];

// Carga/sincronización automática — funcionalidad real (DjiRcSync +
// POST /api/logbook/import-dji, ver 01-reglas.md / CLAUDE.md "Importación
// DJI"): al elegir la carpeta FlightRecord una sola vez, Bitafly la vigila y
// detecta+importa los .txt nuevos solos, sin acción manual repetida.
const SYNC_HIGHLIGHTS = [
  { icon: 'replay', title: 'Se carga sola desde tu control DJI', desc: 'Selecciona la carpeta de vuelos una sola vez — Bitafly detecta los archivos nuevos y los importa automáticamente, sin copiar nada a mano cada vez.' },
  { icon: 'nube', title: 'Sincronización cada 20 segundos', desc: 'Con la auto-sincronización activada, la app revisa la carpeta en segundo plano y sube los vuelos apenas terminan — sin USB, sin recordar hacerlo.' },
  { icon: 'bitacora', title: 'También desde el celular', desc: 'En Android eliges la carpeta completa y se importa lo nuevo en una sola pasada; en iOS seleccionas los archivos .txt directamente — sin instalar nada aparte.' },
];

export default function BitacoraDigitalClient({ faqItems }) {
  const heroRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return undefined;

    const ctx = gsap.context(() => {
      gsap.from('.bd-hero-eyebrow, .bd-hero-title, .bd-hero-sub, .bd-hero-cta, .bd-hero-note', {
        opacity: 0,
        y: 16,
        duration: 0.5,
        ease: 'power1.out',
        stagger: 0.08,
      });
      gsap.from('.bd-hero-visual', { opacity: 0, scale: 0.96, duration: 0.6, ease: 'power2.out', delay: 0.15 });
    }, heroRef);

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
      ctx.revert();
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

      {/* HERO — full-bleed, control DJI con tablet mostrando telemetría en vivo */}
      <section ref={heroRef} className="relative isolate min-h-[80vh] flex items-center overflow-hidden">
        <Image
          src="/screenshots/marketing/hero-bitacora-dji.jpg"
          alt="Control DJI con tablet mostrando telemetría de vuelo en vivo"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[62%_38%] -z-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/30 -z-10" />

        <div className="relative max-w-6xl mx-auto px-6 w-full py-24">
          <div className="max-w-2xl">
            <p className="bd-hero-eyebrow inline-flex items-center gap-2 bg-white/10 backdrop-blur text-primary-200 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">
              Tu propio código de formato · 100% personalizable
            </p>
            <h1 className="bd-hero-title text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mt-5">
              Bitácora de Vuelo <span className="text-primary-300">UAS</span> para Drones
            </h1>
            <p className="bd-hero-sub text-base md:text-lg text-navy-100 max-w-xl mt-5">
              Registra cada operación con despegue, aterrizaje, batería, condiciones y piloto —
              o deja que se cargue sola: conecta tu control DJI y la bitácora se sincroniza
              automáticamente. Genera el Maestro de Vuelo en PDF con el código que tú definas,
              cumpliendo con la RAC 100 desde el primer vuelo.
            </p>
            <div className="bd-hero-cta flex flex-col sm:flex-row items-center gap-3 mt-8">
              <a href="/registro">
                <Button variant="primary" className="px-8 py-3.5 text-sm">
                  Registrar mi primer vuelo
                </Button>
              </a>
              <a href="/rac-100" className="text-sm font-semibold text-white/90 hover:text-white underline underline-offset-4 px-2 py-3.5">
                Ver cumplimiento RAC 100 →
              </a>
            </div>
            <p className="bd-hero-note text-xs text-navy-200 mt-4">
              Bitácora ilimitada en todos los planes · Sin tarjeta de crédito
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

      {/* SINCRONIZACIÓN AUTOMÁTICA — feature real: DjiRcSync + auto-sync 20s */}
      <section className="py-16 md:py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="reveal-fade text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Carga automática</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Se carga sola. <span className="text-primary-600">Se sincroniza sola.</span>
            </h2>
            <p className="text-sm text-navy-300 mt-2 max-w-lg mx-auto">
              Nada de copiar archivos a mano después de cada vuelo — Bitafly vigila la carpeta
              de tu control y sube los registros nuevos apenas están disponibles.
            </p>
          </div>
          <div className="reveal-stagger grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SYNC_HIGHLIGHTS.map((item) => (
              <div key={item.title} className="bg-navy-50 border border-navy-100 rounded-2xl p-5">
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

      {/* EN ACCIÓN — screenshot real del producto */}
      <section className="py-16 md:py-20 px-6 bg-navy-50">
        <div className="max-w-5xl mx-auto">
          <div className="reveal-fade text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">En acción</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Registra cada vuelo en <span className="text-primary-600">segundos</span>
            </h2>
            <p className="text-sm text-navy-300 mt-2 max-w-lg mx-auto">
              Tu tripulación abre el navegador en el celular, selecciona la misión y registra
              despegue, aterrizaje, batería y condiciones. Las horas totales del dron se suman solas.
            </p>
          </div>
          <div className="reveal-fade relative aspect-[1568/718] rounded-3xl overflow-hidden border border-navy-100 shadow-xl bg-white p-3 sm:p-4">
            <Image
              src="/screenshots/bitacora.jpg"
              alt="Bitácora de vuelo real de Bitafly con registros RAC 100"
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-contain rounded-xl"
            />
          </div>
        </div>
      </section>

      {/* CAMPOS — fondo navy oscuro, mismo tratamiento que "Funciones" del home */}
      <section className="py-16 md:py-20 px-6 bg-navy">
        <div className="max-w-5xl mx-auto">
          <div className="reveal-fade text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-300">Campos del registro</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
              Todo lo que exige la AeroCivil en un solo formulario
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
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Bitácora digital — Preguntas</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">
              Todo sobre tu <span className="text-primary-600">Bitácora Digital</span>
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

      {/* CTA final — foto real de dron en vuelo */}
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
            Tu primera bitácora en <span className="text-primary-300">menos de 5 minutos</span>
          </h2>
          <p className="text-sm text-navy-100 mt-2">
            Configura tu organización, agrega tu dron y registra el primer vuelo.
          </p>
          <a href="/registro" className="inline-block mt-6">
            <Button variant="primary" className="px-8 py-3.5 text-sm">
              Comenzar gratis
            </Button>
          </a>
        </div>
      </section>

      <PublicFooter brandDesc="Bitácora digital RAC 100 para operadores UAS en Colombia. Formato F-OPS-002 configurable." />
    </div>
  );
}
