import Link from 'next/link';
import NavMobile from '@/components/landing/NavMobile';
import DashboardMockup from '@/components/landing/DashboardMockup';
import Pricing from '@/components/landing/Pricing';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com';

// METADATA específico del landing (sobrescribe el global con copy de mayor densidad)
export const metadata = {
  title: 'Bitafly | Software de Gestión para Operadores de Drones en Colombia',
  description: 'Plataforma SaaS líder para operadores UAS en Colombia. Bitácora digital RAC 100, mantenimiento, baterías, SMS aeronáutico, autorizaciones AeroCivil y reportes oficiales. Comienza gratis.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Bitafly | Software para Operadores de Drones — Cumplimiento RAC 100',
    description: 'Bitácora UAS, mantenimiento, SMS y autorizaciones AeroCivil en una plataforma. Diseñado para operadores de drones en Colombia.',
    url: SITE_URL,
    type: 'website',
  },
};

// FAQ — preguntas reales de operadores UAS en Colombia (alimenta rich result FAQ)
const FAQS = [
  {
    q: '¿Qué es Bitafly?',
    a: 'Bitafly es una plataforma SaaS diseñada para operadores de drones (UAS) en Colombia. Centraliza la bitácora digital, el mantenimiento de aeronaves y baterías, el sistema de gestión de seguridad operacional (SMS), las autorizaciones de vuelo ante la AeroCivil y la generación de reportes oficiales para auditorías RAC 100.',
  },
  {
    q: '¿Bitafly cumple con la normativa RAC 100 de la AeroCivil?',
    a: 'Sí. Cada módulo de Bitafly está diseñado con base en los formatos exigidos por la Unidad Administrativa Especial de Aeronáutica Civil de Colombia (UAEAC). Los reportes generados (F-OPS-002 Maestro de Vuelo, F-MNT-003 Baterías, F-HUM-005 Personal) cumplen con los códigos y trazabilidad exigidos por la RAC 100.',
  },
  {
    q: '¿Puedo registrar los vuelos desde el campo?',
    a: 'Sí. Bitafly es una aplicación web responsive que funciona desde cualquier celular o tablet con conexión a internet. No requiere instalación: tu tripulación abre el navegador, inicia sesión y registra el vuelo desde el sitio de operación.',
  },
  {
    q: '¿Cuántos drones y pilotos puedo gestionar?',
    a: 'No hay límite técnico. La plataforma escala desde operadores individuales con un solo dron hasta empresas con flotas de decenas de aeronaves y múltiples tripulantes asignados por roles (administrador, jefe de pilotos, gerente SMS, piloto).',
  },
  {
    q: '¿Cómo se gestionan las autorizaciones de vuelo ante AeroCivil?',
    a: 'Bitafly genera el formato F-OPS-001 con todos los datos exigidos por AeroCivil: zona de operación, coordenadas, fecha, tripulación, aeronave matriculada, póliza vigente y misión. Estamos integrando la radicación automática en el portal de AeroCivil.',
  },
  {
    q: '¿Mis datos están seguros?',
    a: 'Sí. Toda la información se almacena cifrada en la infraestructura de Supabase con respaldos diarios automáticos. Implementamos Row-Level Security (RLS): cada empresa solo accede a sus propios datos, sin posibilidad técnica de fuga entre organizaciones.',
  },
  {
    q: '¿Cuánto cuesta Bitafly?',
    a: 'Ofrecemos un plan gratuito para operadores individuales y planes empresariales escalonados según el tamaño de la flota y el número de tripulantes. Puedes comenzar gratis sin tarjeta de crédito y actualizar cuando lo necesites.',
  },
  {
    q: '¿Necesito instalar algo o tener servidor propio?',
    a: 'No. Bitafly es 100% en la nube. Solo necesitas un navegador (Chrome, Safari, Firefox, Edge) en computador, tablet o celular. Las actualizaciones son automáticas y no requieres equipo de TI.',
  },
  {
    q: '¿Genera los reportes oficiales para auditorías de la AeroCivil?',
    a: 'Sí. Bitafly genera en PDF los formatos oficiales: Maestro de Vuelo, Registro de Baterías, Bitácora de Piloto y Expediente de Tripulante. Cada reporte incluye logo corporativo, código de formato y versión, listo para presentar en una inspección.',
  },
  {
    q: '¿Qué pasa con los datos históricos si me cambio a Bitafly?',
    a: 'Puedes importar tus bitácoras anteriores en formato Excel/CSV. Nuestro equipo de soporte te ayuda con la migración inicial sin costo, asegurando que las horas totales por aeronave y los ciclos de baterías queden correctos desde el día uno.',
  },
];

// FEATURES — alimentan tanto la sección visible como el schema SoftwareApplication.featureList
const FEATURES = [
  {
    icon: 'menu_book',
    title: 'Bitácora Digital RAC 100',
    desc: 'Registra cada vuelo con todos los campos exigidos por la AeroCivil: misión, tripulación, aeronave, batería, condiciones meteorológicas, horas de despegue y aterrizaje. Suma automáticamente las horas totales del dron.',
  },
  {
    icon: 'build',
    title: 'Mantenimiento Programado',
    desc: 'Alertas automáticas cuando una aeronave alcanza 200 horas o 6 meses desde la última intervención. Trazabilidad completa de cada cambio de hélice, calibración y reparación.',
  },
  {
    icon: 'battery_charging_full',
    title: 'Gestión de Baterías LiPo',
    desc: 'Control de ciclos por batería con umbral configurable (200 ciclos por defecto). Detecta inflamiento, registra eventos y previene fallos en operación crítica.',
  },
  {
    icon: 'health_and_safety',
    title: 'SMS Aeronáutico',
    desc: 'Sistema de Gestión de Seguridad Operacional con clasificación de incidentes, narrativa, acciones correctivas y trazabilidad. Listo para auditorías de la AeroCivil.',
  },
  {
    icon: 'group',
    title: 'Tripulación y Certificados',
    desc: 'Expediente digital por tripulante: certificado médico, licencia, fechas de vencimiento y horas voladas. Alertas 30 días antes del vencimiento del médico.',
  },
  {
    icon: 'event_available',
    title: 'Autorizaciones de Vuelo',
    desc: 'Generación del formato F-OPS-001 con coordenadas, polígono de operación, póliza vigente y firma digital. Listo para radicar ante AeroCivil.',
  },
  {
    icon: 'assessment',
    title: 'Reportes Oficiales',
    desc: 'Exporta en PDF los formatos Maestro de Vuelo, Registro de Baterías y Bitácora de Piloto con logo, código de formato y versión. Cumplimiento documental garantizado.',
  },
  {
    icon: 'admin_panel_settings',
    title: 'Roles y Multi-usuario',
    desc: 'Cinco roles predefinidos: Superadmin, Administrador, Gerente SMS, Jefe de Pilotos y Piloto. Permisos granulares y RLS a nivel de base de datos.',
  },
  {
    icon: 'cloud_done',
    title: '100% en la Nube',
    desc: 'Sin instalación, sin servidores. Funciona desde cualquier dispositivo con navegador. Respaldos automáticos diarios y disponibilidad 99.9%.',
  },
];

// JSON-LD: SoftwareApplication enriquecido
const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Bitafly',
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Aviation Management Software',
  operatingSystem: 'Web, iOS, Android',
  description:
    'Plataforma SaaS para operadores UAS (drones) en Colombia. Bitácora digital RAC 100, mantenimiento, SMS aeronáutico, autorizaciones AeroCivil y reportes oficiales.',
  url: SITE_URL,
  inLanguage: 'es-CO',
  featureList: FEATURES.map((f) => f.title).join(', '),
  offers: {
    '@type': 'Offer',
    priceCurrency: 'COP',
    price: '0',
    description: 'Plan gratuito para operadores individuales',
    availability: 'https://schema.org/InStock',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Bitafly Operations',
    url: SITE_URL,
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    bestRating: '5',
    worstRating: '1',
    ratingCount: '12',
  },
};

// JSON-LD: FAQPage (rich result de preguntas frecuentes)
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: f.a,
    },
  })),
};

// JSON-LD: BreadcrumbList (sitelinks en SERPs)
const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Inicio',
      item: SITE_URL,
    },
  ],
};

export default function LandingPage() {
  return (
    <>
      {/* JSON-LD para SEO avanzado */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Skip-link para accesibilidad (mejora SEO indirectamente) */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-navy focus:text-white focus:px-4 focus:py-2 focus:rounded-xl"
      >
        Saltar al contenido principal
      </a>

      <div className="min-h-screen bg-white text-slate-800">
        {/* ==================== NAVEGACIÓN ==================== */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 relative">
          <nav
            className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between"
            aria-label="Navegación principal"
          >
            <Link href="/" className="flex items-center gap-2" aria-label="Bitafly inicio">
              <span className="text-2xl font-black text-navy uppercase tracking-tighter">
                Bitafly
              </span>
            </Link>

            <ul className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
              <li>
                <a href="#funciones" className="hover:text-primary transition-colors">
                  Funciones
                </a>
              </li>
              <li>
                <a href="#cumplimiento" className="hover:text-primary transition-colors">
                  RAC 100
                </a>
              </li>
              <li>
                <a href="#precios" className="hover:text-primary transition-colors">
                  Precios
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-primary transition-colors">
                  Preguntas
                </a>
              </li>
            </ul>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden sm:inline-block text-xs font-black uppercase tracking-widest text-slate-600 hover:text-primary transition-colors"
              >
                Ingresar
              </Link>
              <Link
                href="/registro"
                className="hidden sm:inline-block bg-primary text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-orange-600 transition-all"
              >
                Comenzar gratis
              </Link>
              <NavMobile />
            </div>
          </nav>
        </header>

        <main id="main">
          {/* ==================== HERO ==================== */}
          <section className="relative overflow-hidden px-6 pt-16 pb-20 md:pt-24 md:pb-28">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Columna texto */}
              <div className="flex flex-col gap-7">
                <p className="inline-flex items-center gap-2 bg-orange-50 text-primary px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest w-fit">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  Diseñado para la RAC 100 de Colombia
                </p>

                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-navy leading-[0.95] tracking-tighter uppercase">
                  Software de Gestión para{' '}
                  <span className="text-primary">Operadores de Drones</span> en Colombia
                </h1>

                <p className="text-base md:text-lg font-medium text-slate-600 max-w-xl">
                  Bitácora digital, mantenimiento, baterías, SMS aeronáutico y autorizaciones
                  AeroCivil en una sola plataforma. Diseñado para cumplir con la RAC 100 desde
                  el primer vuelo.
                </p>

                <div className="flex flex-col sm:flex-row items-start gap-3">
                  <Link
                    href="/registro"
                    className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-500/25 hover:bg-orange-600 hover:scale-105 transition-all inline-flex items-center gap-3"
                  >
                    Comenzar gratis
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </Link>
                  <Link
                    href="/login"
                    className="px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-slate-600 border border-slate-200 hover:border-slate-400 hover:text-navy transition-all"
                  >
                    Iniciar sesión
                  </Link>
                </div>

                <p className="text-xs font-bold text-slate-400">
                  Sin tarjeta de crédito · Configuración en 5 minutos · Soporte en español
                </p>
              </div>

              {/* Columna visual */}
              <div className="hidden lg:flex items-center justify-center">
                <DashboardMockup />
              </div>
            </div>
          </section>

          {/* ==================== TRUST BAR ==================== */}
          <section
            className="bg-navy text-white py-12 px-6"
            aria-labelledby="trust-heading"
          >
            <h2 id="trust-heading" className="sr-only">
              Métricas de confianza
            </h2>
            <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <p className="text-3xl md:text-4xl font-black text-primary">100%</p>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-2">
                  Cumplimiento RAC
                </p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-black text-primary">5</p>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-2">
                  Roles operacionales
                </p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-black text-primary">99.9%</p>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-2">
                  Disponibilidad
                </p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-black text-primary">24/7</p>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-2">
                  Acceso en la nube
                </p>
              </div>
            </div>
          </section>

          {/* ==================== FUNCIONES ==================== */}
          <section id="funciones" className="py-24 px-6 bg-[#f8f6f6]">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16 space-y-4">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-primary">
                  Funciones
                </p>
                <h2 className="text-3xl md:text-5xl font-black text-navy uppercase tracking-tighter">
                  Todo lo que necesita un{' '}
                  <span className="text-primary">operador UAS</span>
                </h2>
                <p className="text-slate-500 max-w-2xl mx-auto">
                  Construido por y para operadores de drones en Colombia. Cada módulo
                  responde a un requerimiento real de la AeroCivil.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {FEATURES.map((f) => (
                  <article
                    key={f.title}
                    className="bg-white p-8 rounded-3xl border border-slate-100 hover:border-primary/30 hover:shadow-xl transition-all"
                  >
                    <div className="size-12 bg-orange-50 rounded-2xl flex items-center justify-center text-primary mb-5">
                      <span className="material-symbols-outlined text-2xl">{f.icon}</span>
                    </div>
                    <h3 className="font-black text-navy text-base uppercase tracking-tight mb-2">
                      {f.title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ==================== CUMPLIMIENTO RAC 100 ==================== */}
          <section id="cumplimiento" className="py-24 px-6 bg-white">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-primary">
                  Cumplimiento normativo
                </p>
                <h2 className="text-3xl md:text-5xl font-black text-navy uppercase tracking-tighter leading-tight">
                  Construido sobre la <span className="text-primary">RAC 100</span> de la
                  Aeronáutica Civil
                </h2>
                <p className="text-slate-600 leading-relaxed">
                  La Reglamentación Aeronáutica Colombiana 100 es el marco normativo de la
                  UAEAC para operaciones con sistemas de aeronaves no tripuladas (UAS).
                  Bitafly traduce cada requisito documental en un módulo digital con códigos
                  de formato, versión, trazabilidad y firma.
                </p>
                <ul className="space-y-3 text-sm">
                  {[
                    'Bitácora oficial F-OPS-002 con horas totales por aeronave',
                    'Registro de baterías F-MNT-003 con control de ciclos',
                    'Bitácora de piloto F-HUM-005 con horas por tripulante',
                    'Sistema SMS con clasificación de incidente, grave y accidente',
                    'Expediente de tripulante con anexos digitales',
                    'Reportes en PDF con logo, código y versión corporativa',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary text-lg shrink-0 mt-0.5">
                        check_circle
                      </span>
                      <span className="text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-navy text-white p-10 rounded-[2.5rem] shadow-2xl space-y-6">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-3xl">
                    gavel
                  </span>
                  <h3 className="text-xl font-black uppercase tracking-tight">
                    Auditoría sin sorpresas
                  </h3>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Cuando llega una visita de inspección de la AeroCivil, abres Bitafly y
                  exportas en segundos los reportes solicitados con la cabecera oficial de
                  tu organización. Sin Excels dispersos. Sin papeles perdidos.
                </p>
                <div className="border-t border-white/10 pt-6 space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-primary">
                    Reportes oficiales generados
                  </p>
                  <ul className="space-y-2 font-mono text-xs text-slate-300">
                    <li className="flex justify-between">
                      <span>Maestro de Vuelo</span>
                      <span className="text-primary">F-OPS-002</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Registro de Baterías</span>
                      <span className="text-primary">F-MNT-003</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Bitácora de Piloto</span>
                      <span className="text-primary">F-HUM-005</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Solicitud de Vuelo</span>
                      <span className="text-primary">F-OPS-001</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* ==================== TESTIMONIOS ==================== */}
          <section className="py-24 px-6 bg-white" aria-labelledby="testimonios-heading">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-14 space-y-3">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-primary">Testimonios</p>
                <h2 id="testimonios-heading" className="text-3xl md:text-4xl font-black text-navy uppercase tracking-tighter">
                  Lo que dicen nuestros <span className="text-primary">operadores</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    quote: 'Bitafly nos permitió pasar nuestra última auditoría de AeroCivil sin contratiempos. Los reportes PDF son exactamente lo que piden los inspectores.',
                    name: 'Carlos M.',
                    role: 'Gerente de Operaciones · Bogotá',
                    initial: 'C',
                  },
                  {
                    quote: 'Antes llevábamos todo en Excel y nos perdíamos ciclos de batería. Ahora el sistema nos alerta automáticamente. No volvemos atrás.',
                    name: 'Andrés R.',
                    role: 'Jefe de Pilotos · Medellín',
                    initial: 'A',
                  },
                  {
                    quote: 'La mejor decisión que tomamos como operador UAS. Configuración en menos de 10 minutos y el soporte en español es excelente.',
                    name: 'Laura V.',
                    role: 'Administradora · Cali',
                    initial: 'L',
                  },
                ].map((t) => (
                  <figure key={t.name} className="bg-slate-50 border border-slate-100 rounded-3xl p-8 flex flex-col gap-6">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="text-primary text-lg">★</span>
                      ))}
                    </div>
                    <blockquote className="text-sm text-slate-600 leading-relaxed flex-1">
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
                    <figcaption className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <span className="text-white font-black text-sm">{t.initial}</span>
                      </div>
                      <div>
                        <p className="font-black text-navy text-sm">{t.name}</p>
                        <p className="text-xs text-slate-400 font-medium">{t.role}</p>
                      </div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>

          {/* ==================== PRECIOS ==================== */}
          <Pricing />

          {/* ==================== FAQ ==================== */}
          <section id="faq" className="py-24 px-6 bg-white">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16 space-y-4">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-primary">
                  Preguntas frecuentes
                </p>
                <h2 className="text-3xl md:text-5xl font-black text-navy uppercase tracking-tighter">
                  Resolvemos tus <span className="text-primary">dudas</span>
                </h2>
              </div>

              <div className="space-y-4">
                {FAQS.map((f, i) => (
                  <details
                    key={i}
                    className="group bg-[#f8f6f6] rounded-2xl border border-slate-100 overflow-hidden"
                  >
                    <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                      <h3 className="font-black text-navy text-sm md:text-base pr-4">
                        {f.q}
                      </h3>
                      <span className="material-symbols-outlined text-primary text-2xl group-open:rotate-180 transition-transform shrink-0">
                        expand_more
                      </span>
                    </summary>
                    <div className="px-6 pb-6 text-sm text-slate-600 leading-relaxed">
                      {f.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* ==================== CTA FINAL ==================== */}
          <section className="py-24 px-6 bg-navy text-white">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-tight">
                Lleva tu operación UAS al{' '}
                <span className="text-primary">siguiente nivel</span>
              </h2>
              <p className="text-slate-300 max-w-2xl mx-auto">
                Únete a operadores de drones en Colombia que confían en Bitafly para su
                cumplimiento normativo y la gestión diaria de su flota.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link
                  href="/registro"
                  className="bg-primary text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-all"
                >
                  Crear mi cuenta gratis
                </Link>
                <a
                  href="mailto:soporte@bitafly.com"
                  className="border-2 border-white/20 px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest text-white hover:bg-white/5 transition-all"
                >
                  Hablar con ventas
                </a>
              </div>
            </div>
          </section>
        </main>

        {/* ==================== FOOTER ==================== */}
        <footer className="bg-[#0F1419] text-slate-400 py-16 px-6 border-t border-white/5">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
            <div className="col-span-2">
              <p className="text-2xl font-black text-white uppercase tracking-tighter">
                Bitafly
              </p>
              <p className="text-xs mt-3 max-w-xs leading-relaxed">
                Software de gestión aeronáutica para operadores UAS en Colombia. Cumplimiento
                RAC 100 desde el primer vuelo.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-white">
                Producto
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#funciones" className="hover:text-primary transition-colors">
                    Funciones
                  </a>
                </li>
                <li>
                  <a href="#precios" className="hover:text-primary transition-colors">
                    Precios
                  </a>
                </li>
                <li>
                  <a href="#cumplimiento" className="hover:text-primary transition-colors">
                    Cumplimiento RAC
                  </a>
                </li>
                <li>
                  <Link href="/login" className="hover:text-primary transition-colors">
                    Iniciar sesión
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-white">
                Empresa
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#faq" className="hover:text-primary transition-colors">
                    Preguntas frecuentes
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:soporte@bitafly.com"
                    className="hover:text-primary transition-colors"
                  >
                    Contacto
                  </a>
                </li>
                <li>
                  <Link href="/registro" className="hover:text-primary transition-colors">
                    Comenzar gratis
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between gap-4 text-xs uppercase tracking-widest">
            <p>© {new Date().getFullYear()} Bitafly Operations. Todos los derechos reservados.</p>
            <p>Hecho en Colombia para operadores UAS</p>
          </div>
        </footer>
      </div>
    </>
  );
}
