import Link from 'next/link';
import Image from 'next/image';
import LandingNav from '@/components/landing/LandingNav';
import DashboardMockup from '@/components/landing/DashboardMockup';
import Pricing from '@/components/landing/Pricing';
import Contact from '@/components/landing/Contact';
import Decor from '@/components/landing/Decor';
import FeatureSpotlight from '@/components/landing/FeatureSpotlight';
import SEOFooter from '@/components/seo/SEOFooter';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com').replace(/\/$/, '');

// METADATA específico del landing (sobrescribe el global con copy de mayor densidad)
export const metadata = {
  title: 'Software de Gestión para Drones en Colombia | Bitafly',
  description: 'Plataforma SaaS líder para operadores UAS en Colombia. Bitácora digital RAC 100, mantenimiento, baterías, SMS aeronáutico, autorizaciones AeroCivil y reportes RAC 100 con tu propio código de formato. Comienza gratis.',
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
// Cada pregunta tiene un "group" solo de presentación (agrupación visual, no cambia el schema)
const FAQ_GROUPS = ['Plataforma y planes', 'Cumplimiento RAC 100', 'Módulos avanzados', 'Datos y seguridad'];

const FAQS = [
  {
    group: 'Plataforma y planes',
    q: '¿Qué es Bitafly?',
    a: 'Bitafly es una plataforma SaaS diseñada para operadores de drones (UAS) en Colombia. Centraliza la bitácora digital, el mantenimiento de aeronaves y baterías, el sistema de gestión de seguridad operacional (SMS), las autorizaciones de vuelo ante la AeroCivil y la generación de reportes para auditorías RAC 100, con tu propio código de formato.',
  },
  {
    group: 'Plataforma y planes',
    q: '¿Cuánto cuesta Bitafly?',
    a: 'Ofrecemos un plan Piloto para operadores individuales y planes empresariales escalonados (Escuadrilla, Flota, Enterprise) según el tamaño de la flota y el número de tripulantes. Todos los planes tienen período de prueba y no requieren tarjeta de crédito para iniciar.',
  },
  {
    group: 'Plataforma y planes',
    q: '¿Puedo agregar drones o pilotos adicionales sin cambiar de plan?',
    a: 'Sí. Sin importar el plan contratado, puedes ampliar tus cupos comprando unidades adicionales: piloto adicional o dron adicional, por un valor mensual fijo cada uno. No necesitas subir de plan solo por sumar un dron o un tripulante más.',
  },
  {
    group: 'Plataforma y planes',
    q: '¿Cuántos drones y pilotos puedo gestionar?',
    a: 'No hay límite técnico. La plataforma escala desde operadores individuales con un solo dron hasta empresas con flotas de decenas de aeronaves y múltiples tripulantes asignados por roles (Gerente General, Jefe de Pilotos, Gerente SMS, Piloto).',
  },
  {
    group: 'Plataforma y planes',
    q: '¿Puedo gestionar varias organizaciones con una sola cuenta?',
    a: 'Sí. Una misma cuenta puede pertenecer a varias organizaciones al mismo tiempo (por ejemplo, un piloto que trabaja para varias operadoras, o un dueño con varias empresas). Un selector en el dashboard permite cambiar de organización activa en cualquier momento, sin mezclar los datos de una y otra.',
  },
  {
    group: 'Plataforma y planes',
    q: '¿Necesito instalar algo o tener servidor propio?',
    a: 'No. Bitafly es 100% en la nube. Solo necesitas un navegador (Chrome, Safari, Firefox, Edge) en computador, tablet o celular. Las actualizaciones son automáticas y no requieres equipo de TI.',
  },
  {
    group: 'Cumplimiento RAC 100',
    q: '¿Bitafly cumple con la normativa RAC 100 de la AeroCivil?',
    a: 'Sí. Cada módulo de Bitafly está diseñado con base en los registros exigidos por la Unidad Administrativa Especial de Aeronáutica Civil de Colombia (UAEAC). La RAC 100 no impone códigos de formato oficiales: cada operador define su nomenclatura en su manual. Los reportes generados (Maestro de Vuelo, Baterías y Personal, con códigos F-OPS-002, F-MNT-003 y F-HUM-005 por defecto, personalizables) cumplen con la trazabilidad exigida por la RAC 100.',
  },
  {
    group: 'Cumplimiento RAC 100',
    q: '¿Cómo se gestionan las autorizaciones de vuelo ante AeroCivil?',
    a: 'Bitafly genera tu solicitud de autorización (formato F-OPS-001 por defecto, personalizable) con todos los datos exigidos por AeroCivil: zona de operación, coordenadas, fecha, tripulación, aeronave matriculada, póliza vigente, misión y evaluación SORA asociada. Estamos integrando la radicación automática en el portal de AeroCivil.',
  },
  {
    group: 'Cumplimiento RAC 100',
    q: '¿Genera los reportes para auditorías de la AeroCivil?',
    a: 'Sí. Bitafly genera en PDF y Excel más de 20 formatos: Maestro de Vuelo, Registro de Baterías, Bitácora de Piloto, Expediente de Tripulante, Trazabilidad de Componentes, Auditoría de Proveedores, Indicadores de Seguridad Operacional (SPI) y el Reporte Operacional Mensual UAS exigido por Aerocivil, entre otros. Cada reporte incluye logo corporativo, tu código de formato y versión, listo para presentar en una inspección.',
  },
  {
    group: 'Cumplimiento RAC 100',
    q: '¿Qué pasa con los datos históricos si me cambio a Bitafly?',
    a: 'Puedes importar tus bitácoras anteriores en formato Excel/CSV. Nuestro equipo de soporte te ayuda con la migración inicial sin costo, asegurando que las horas totales por aeronave y los ciclos de baterías queden correctos desde el día uno.',
  },
  {
    group: 'Módulos avanzados',
    q: '¿Bitafly gestiona la capacitación y los exámenes de mis pilotos?',
    a: 'Sí. Puedes crear un cronograma de capacitación con recurrencia y un examen interno calificado (banco de preguntas, nota mínima e intentos configurables). Si un piloto no aprueba el examen de Operaciones o su plazo vence, el sistema bloquea su despacho hasta que quede al día.',
  },
  {
    group: 'Módulos avanzados',
    q: '¿Puedo auditar mis proveedores desde la plataforma?',
    a: 'Sí. El módulo de Proveedores permite llevar tu listado de proveedores con un checklist de auditoría personalizable, calificación por auditoría y reportes descargables por proveedor o consolidados.',
  },
  {
    group: 'Módulos avanzados',
    q: '¿Qué diferencia hay entre mantenimiento mayor y mantenimiento menor?',
    a: 'El mantenimiento mayor es el que realiza un técnico cada cierto número de horas de vuelo o días calendario (hélices, calibración, reparaciones). El mantenimiento menor es un chequeo ligero que hace el propio piloto con una periodicidad independiente definida por la organización — ambos, si están vencidos, bloquean el despacho de la aeronave hasta quedar al día.',
  },
  {
    group: 'Módulos avanzados',
    q: '¿El sistema evalúa el riesgo de cada vuelo antes de despachar?',
    a: 'Sí. Además de la evaluación SORA por misión, el wizard de despacho incluye un paso de Evaluación de Riesgos: el piloto clasifica Probabilidad y Gravedad contra la matriz configurada por el Gerente SMS de la organización, y si el resultado es "Inaceptable" debe documentar barreras de mitigación antes de poder continuar.',
  },
  {
    group: 'Datos y seguridad',
    q: '¿Puedo registrar los vuelos desde el campo?',
    a: 'Sí. Bitafly es una aplicación web responsive que funciona desde cualquier celular o tablet con conexión a internet, y además cuenta con una app Android nativa para los controladores DJI RC Plus. No requiere instalación en PC: tu tripulación abre el navegador o la app, inicia sesión y registra el vuelo desde el sitio de operación.',
  },
  {
    group: 'Datos y seguridad',
    q: '¿Mis datos están seguros?',
    a: 'Sí. Toda la información se almacena cifrada en infraestructura en la nube con respaldos automáticos. Implementamos Row-Level Security (RLS): cada organización solo accede a sus propios datos, sin posibilidad técnica de fuga entre organizaciones — incluso cuando una cuenta pertenece a varias organizaciones a la vez.',
  },
];

// FEATURES — alimentan tanto la sección visible como el schema SoftwareApplication.featureList.
// Agrupadas en las mismas 4 categorías que organiza el propio sidebar de la app (Operación /
// Flota & Equipo / Documentación & Cumplimiento) + un cuarto grupo de plataforma/negocio —
// para que el landing describa exactamente lo que existe en el producto, no una versión
// aspiracional. FEATURE_GROUPS define el orden y el ícono de cada bloque.
const FEATURE_GROUPS = [
  { name: 'Operación',                      icon: 'radar' },
  { name: 'Flota & Equipo',                 icon: 'precision_manufacturing' },
  { name: 'Documentación & Cumplimiento',   icon: 'gavel' },
  { name: 'Plataforma y Seguridad',         icon: 'shield_lock' },
];

const FEATURES = [
  // ---------- Operación ----------
  {
    group: 'Operación',
    icon: 'menu_book',
    title: 'Bitácora Digital RAC 100',
    desc: 'Registra cada vuelo con todos los campos exigidos por la AeroCivil: misión, tripulación, aeronave, batería, condiciones meteorológicas, horas de despegue y aterrizaje. Suma automáticamente las horas totales del dron.',
    href: '/bitacora-digital',
  },
  {
    group: 'Operación',
    icon: 'event_available',
    title: 'Programación de Misiones',
    desc: 'Crea órdenes de vuelo con PIC, aeronave, zona y horario. Toda misión nueva exige una evaluación SORA (GRC/ARC/SAIL) completa antes de poder autorizarse. Exporta KMZ y PDF con un clic.',
    href: '/autorizaciones-aerocivil',
  },
  {
    group: 'Operación',
    icon: 'health_and_safety',
    title: 'Despacho con Evaluación de Riesgos',
    desc: 'El wizard de despacho evalúa Probabilidad × Gravedad contra la matriz de tu organización antes de cada vuelo; si el riesgo es "Inaceptable" exige documentar barreras de mitigación antes de continuar.',
  },
  {
    group: 'Operación',
    icon: 'my_location',
    title: 'Replay GPS de Vuelo',
    desc: 'Reproduce cada operación cuadro a cuadro sobre el mapa: ruta GPS, altitud, velocidad, batería y joysticks del control. Importa el log del DJI RC/RC 2 y analiza el vuelo como si estuvieras ahí.',
    href: '/replay-gps-drones',
    badge: 'Destacado',
  },
  {
    group: 'Operación',
    icon: 'partly_cloudy_day',
    title: 'Clima y Meteorología UAV',
    desc: 'Verifica viento, ráfagas, visibilidad, lluvia e índice Kp del GPS antes de cada vuelo. Score de aptitud 0-100 integrado en la programación, el despacho y el replay.',
    href: '/clima-drones',
  },
  {
    group: 'Operación',
    icon: 'apartment',
    title: 'Multi-organización por Cuenta',
    desc: 'Una misma cuenta puede pertenecer a varias organizaciones a la vez — un piloto que vuela para varias operadoras, o un dueño con varias empresas — y cambiar de una a otra con un clic, sin mezclar datos.',
    badge: 'Nuevo',
  },

  // ---------- Flota & Equipo ----------
  {
    group: 'Flota & Equipo',
    icon: 'precision_manufacturing',
    title: 'Gestión de Flota',
    desc: 'Registro de aeronaves con serial, modelo, foto y estado operativo. Suma horas de vuelo automáticamente al importar logs DJI y muestra el estado de toda tu flota en tiempo real.',
    href: '/gestion-flota-drones',
  },
  {
    group: 'Flota & Equipo',
    icon: 'build',
    title: 'Mantenimiento Programado',
    desc: 'Alertas automáticas por horas de vuelo o días calendario, con bloqueo de despacho al vencer. Trazabilidad de cada componente cambiado (hélices, motores, ESC) con horas de uso individuales.',
    href: '/mantenimiento-drones',
  },
  {
    group: 'Flota & Equipo',
    icon: 'checklist',
    title: 'Mantenimiento Menor (Piloto)',
    desc: 'Un chequeo ligero que hace el propio piloto, con periodicidad y contadores 100% independientes del mantenimiento mayor — también bloquea el despacho si está vencido.',
  },
  {
    group: 'Flota & Equipo',
    icon: 'battery_charging_full',
    title: 'Gestión de Baterías LiPo',
    desc: 'Control de ciclos por batería con umbral configurable (200 ciclos por defecto). Detecta inflamiento, registra eventos y previene fallos en operación crítica.',
    href: '/mantenimiento-drones',
  },
  {
    group: 'Flota & Equipo',
    icon: 'inventory_2',
    title: 'Inventario de Operación',
    desc: 'Checklist de equipo requerido antes de volar (baterías cargadas, botiquín, extintor) con existencias reales de equipo visibles junto a cada ítem al diligenciarlo.',
  },

  // ---------- Documentación & Cumplimiento ----------
  {
    group: 'Documentación & Cumplimiento',
    icon: 'health_and_safety',
    title: 'SMS Aeronáutico',
    desc: 'Sistema de Gestión de Seguridad Operacional: matriz de riesgo, Indicadores de Desempeño (SPI) con líneas de alerta, autoevaluación GAP, acciones correctivas y biblioteca de protocolos y auditoría interna.',
    href: '/sms-aeronautico',
  },
  {
    group: 'Documentación & Cumplimiento',
    icon: 'group',
    title: 'Tripulación y Certificados',
    desc: 'Expediente digital por tripulante: certificado médico, licencia, fechas de vencimiento y horas voladas. Alertas 30 días antes del vencimiento del médico.',
    href: '/gestion-pilotos',
  },
  {
    group: 'Documentación & Cumplimiento',
    icon: 'school',
    title: 'Capacitación con Examen Calificado',
    desc: 'Cronograma de capacitación con recurrencia y examen interno calificado. Si un piloto no lo aprueba o vence su plazo, el sistema bloquea su despacho hasta que quede al día.',
  },
  {
    group: 'Documentación & Cumplimiento',
    icon: 'store',
    title: 'Auditoría de Proveedores',
    desc: 'Listado de proveedores con checklist de auditoría personalizable por tu organización, calificación por auditoría y reportes descargables por proveedor o consolidados.',
  },
  {
    group: 'Documentación & Cumplimiento',
    icon: 'library_books',
    title: 'Manuales Corporativos',
    desc: 'Repositorio versionado de manuales con acuse de lectura obligatorio por versión y acta de divulgación en PDF — evidencia lista para una auditoría de la AeroCivil.',
  },
  {
    group: 'Documentación & Cumplimiento',
    icon: 'assessment',
    title: 'Reportes RAC 100',
    desc: 'Más de 20 formatos en PDF y Excel —Maestro de Vuelo, Baterías, Expediente de Tripulante, Indicadores SPI, Reporte Operacional Mensual UAS— con tu logo, código de formato y versión.',
    href: '/reportes-auditoria',
  },

  // ---------- Plataforma y Seguridad ----------
  {
    group: 'Plataforma y Seguridad',
    icon: 'admin_panel_settings',
    title: 'Roles y Multi-usuario',
    desc: 'Cinco roles predefinidos: Administrador, Gerente SMS, Jefe de Pilotos, Piloto y Superadmin. Permisos granulares y aislamiento de datos por organización a nivel de base de datos.',
  },
  {
    group: 'Plataforma y Seguridad',
    icon: 'add_circle',
    title: 'Recursos Adicionales',
    desc: 'Amplía tus cupos de dron o piloto sin importar el plan contratado, por un valor mensual fijo cada uno — sin necesidad de subir a un plan superior.',
  },
  {
    group: 'Plataforma y Seguridad',
    icon: 'smartphone',
    title: 'App Android para DJI RC Plus',
    desc: 'Aplicación nativa instalada directamente en el controlador DJI RC Plus, con actualizaciones automáticas por aire (OTA) — sin pasar por Google Play.',
  },
  {
    group: 'Plataforma y Seguridad',
    icon: 'cloud_done',
    title: '100% en la Nube',
    desc: 'Sin instalación, sin servidores. Funciona desde cualquier dispositivo con navegador. Respaldos automáticos y aislamiento de datos por organización (Row-Level Security).',
  },
];

// JSON-LD: SoftwareApplication enriquecido
const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': `${SITE_URL}/#software`,
  name: 'Bitafly',
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Aviation Management Software',
  operatingSystem: 'Web, iOS, Android',
  description:
    'Plataforma SaaS para operadores UAS (drones) en Colombia. Bitácora digital RAC 100, mantenimiento, SMS aeronáutico, autorizaciones AeroCivil y reportes RAC 100 con tu propio código de formato.',
  url: SITE_URL,
  inLanguage: 'es-CO',
  featureList: FEATURES.map((f) => f.title).join(', '),
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'COP',
    description: 'Plan Piloto — 15 días de prueba para operadores individuales',
    availability: 'https://schema.org/InStock',
    eligibleRegion: { '@type': 'Country', name: 'Colombia' },
    url: `${SITE_URL}/registro`,
  },
  // publisher referencia @id del Organization (ancla cross-page)
  publisher: { '@id': `${SITE_URL}/#organization` },
  // Nota: sin aggregateRating — no publicamos rich results de calificación hasta
  // tener reseñas verificables reales que lo respalden.
};

// WebPage — declara el tipo de página para Googlebot
const webPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${SITE_URL}/#webpage`,
  'url': SITE_URL,
  'name': 'Bitafly | Software de Gestión para Operadores de Drones en Colombia',
  'isPartOf': { '@id': `${SITE_URL}/#website` },
  'about': { '@id': `${SITE_URL}/#software` },
  'inLanguage': 'es-CO',
  'description': 'Plataforma SaaS líder para operadores UAS en Colombia. Bitácora digital RAC 100, mantenimiento, baterías, SMS aeronáutico, autorizaciones AeroCivil y reportes RAC 100 con tu propio código de formato.',
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
      {/* JSON-LD para SEO avanzado — inline para que Googlebot los vea en HTML inicial */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="min-h-screen bg-white text-slate-800">
        <LandingNav />

        <main id="main">
          {/* ==================== HERO ==================== */}
          <section className="relative isolate overflow-hidden px-6 pt-16 pb-20 md:pt-24 md:pb-28">
            <Decor variant="hero" />
            <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
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
            className="relative isolate overflow-hidden bg-navy text-white py-12 px-6"
            aria-labelledby="trust-heading"
          >
            <Decor variant="dark" />
            <h2 id="trust-heading" className="sr-only">
              Métricas de confianza
            </h2>
            <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
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
          <section id="funciones" className="relative isolate overflow-hidden py-24 px-6 bg-[#f8f6f6]">
            <Decor variant="light" />
            <div className="relative z-10 max-w-6xl mx-auto">
              <div className="text-center mb-16 space-y-4">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-primary">
                  Funciones
                </p>
                <h2 className="text-3xl md:text-5xl font-black text-navy uppercase tracking-tighter">
                  Todo lo que necesita un{' '}
                  <span className="text-primary">operador UAS</span>
                </h2>
                <p className="text-slate-500 max-w-2xl mx-auto">
                  Construido por y para operadores de drones en Colombia. Organizado igual que
                  tu operación: día a día, flota, y cumplimiento documental.
                </p>
              </div>

              <div className="space-y-14">
                {FEATURE_GROUPS.map((group) => {
                  const groupFeatures = FEATURES.filter((f) => f.group === group.name);
                  if (!groupFeatures.length) return null;
                  return (
                    <div key={group.name}>
                      <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary mb-6">
                        <span className="material-symbols-outlined text-base">{group.icon}</span>
                        {group.name}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groupFeatures.map((f) => {
                          const inner = (
                            <>
                              <div className="size-12 bg-orange-50 rounded-2xl flex items-center justify-center text-primary mb-5">
                                <span className="material-symbols-outlined text-2xl">{f.icon}</span>
                              </div>
                              <h4 className="flex items-center gap-2 font-black text-navy text-base uppercase tracking-tight mb-2">
                                {f.title}
                                {f.badge && (
                                  <span className="bg-primary text-white text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full leading-none">
                                    {f.badge}
                                  </span>
                                )}
                              </h4>
                              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                              {f.href && (
                                <span className="inline-flex items-center gap-1 mt-4 text-xs font-black uppercase tracking-widest text-primary group-hover:gap-2 transition-all">
                                  Ver módulo
                                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </span>
                              )}
                            </>
                          );
                          return f.href ? (
                            <Link
                              key={f.title}
                              href={f.href}
                              className="group bg-white p-8 rounded-3xl border border-slate-100 hover:border-primary/30 hover:shadow-xl transition-all cursor-pointer"
                            >
                              {inner}
                            </Link>
                          ) : (
                            <article
                              key={f.title}
                              className="bg-white p-8 rounded-3xl border border-slate-100 hover:border-primary/30 hover:shadow-xl transition-all"
                            >
                              {inner}
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ==================== BITAFLY EN ACCIÓN (screenshots reales) ==================== */}
          {/* 3 módulos reales, capturados contra la organización QA de prueba
              (ver docs/plan-mejora-visual-landing-bitafly.md, Fase 0) — reemplaza
              el patrón repetido de ícono+texto con evidencia real del producto,
              reutilizando FeatureSpotlight (mismo componente ya usado en las
              páginas SEO satélite) en vez de duplicar el layout. */}
          <FeatureSpotlight
            overline="Meteorología integrada"
            title={<>Decide con datos, no <span style={{ color: '#ec5b13' }}>a ojo</span></>}
            desc="Viento, ráfagas, visibilidad, precipitación e índice Kp del punto exacto de vuelo, con semáforo GO / Precaución / NO-GO y pronóstico horario — sin salir de Bitafly."
            bullets={[
              'Datos en tiempo real por coordenada, no un promedio regional',
              'Pronóstico horario para planear la ventana de vuelo del día',
              'Se integra directo en Programación, Despacho y Replay GPS',
            ]}
            decor="minimal"
          >
            <Image
              src="/screenshots/meteorologia.jpg"
              alt="Pantalla de Meteorología de Bitafly con viento, ráfagas, visibilidad y pronóstico horario"
              width={1568}
              height={718}
              className="w-full h-auto rounded-3xl shadow-2xl border border-slate-200"
            />
          </FeatureSpotlight>

          <FeatureSpotlight
            overline="Documentación RAC 100"
            title={<>Más de 20 formatos, listos en <span style={{ color: '#ec5b13' }}>un clic</span></>}
            desc="Libro de vuelo, mantenimiento, baterías, flota, SORA, componentes, capacitación y más — cada uno en PDF o Excel con tu propio código de formato y firma."
            bullets={[
              'Alcance configurable: toda la flota, una aeronave o un tripulante',
              'Nota de trazabilidad con periodo y fecha de descarga en cada reporte',
              'El mismo set que pide una auditoría de AeroCivil, sin armarlo a mano',
            ]}
            flip
            bg="#f8f6f6"
            decor="minimal"
          >
            <Image
              src="/screenshots/reportes.jpg"
              alt="Pantalla de Reportes de Bitafly con la grilla de formatos RAC 100 disponibles"
              width={1568}
              height={718}
              className="w-full h-auto rounded-3xl shadow-2xl border border-slate-200"
            />
          </FeatureSpotlight>

          <FeatureSpotlight
            overline="Seguridad SMS"
            title={<>Todo tu sistema de gestión <span style={{ color: '#ec5b13' }}>de seguridad</span></>}
            desc="SORA, evaluación de riesgos, indicadores de desempeño (SPI), mejora continua, acciones correctivas y capacitación — organizados en un solo hub, no repartidos en pestañas sueltas."
            bullets={[
              'Análisis SORA obligatorio antes de autorizar cualquier misión',
              'Indicadores SPI con líneas de alerta calculadas automáticamente',
              'Capacitación SMS con cronograma, asistencia y evidencia real',
            ]}
            decor="minimal"
          >
            <Image
              src="/screenshots/seguridad-sms.jpg"
              alt="Hub de Seguridad SMS de Bitafly con las secciones de Evaluación, Desempeño, Cumplimiento y Recursos"
              width={1456}
              height={667}
              className="w-full h-auto rounded-3xl shadow-2xl border border-slate-200"
            />
          </FeatureSpotlight>

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
                  Bitafly traduce cada requisito documental en un módulo digital con tus
                  propios códigos de formato, versión, trazabilidad y firma. La RAC 100 no
                  impone una nomenclatura: cada operador la define en su manual y tú la
                  personalizas en Bitafly.
                </p>
                <ul className="space-y-3 text-sm">
                  {[
                    'Bitácora de vuelo (F-OPS-002 por defecto) con horas totales por aeronave',
                    'Registro de baterías (F-MNT-003 por defecto) con control de ciclos',
                    'Bitácora de piloto (F-HUM-005 por defecto) con horas por tripulante',
                    'Evaluación SORA obligatoria antes de programar cualquier misión',
                    'SMS con matriz de riesgo, indicadores de desempeño (SPI) y acciones correctivas',
                    'Expediente de tripulante con anexos digitales y capacitación registrada',
                    'Reporte Operacional Mensual UAS y +20 formatos más en PDF/Excel con tu código de formato',
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

              <div className="relative isolate overflow-hidden bg-navy text-white p-10 rounded-[2.5rem] shadow-2xl space-y-6">
                <Decor variant="dark" />
                <div className="relative z-10 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-3xl">
                    gavel
                  </span>
                  <h3 className="text-xl font-black uppercase tracking-tight">
                    Auditoría sin sorpresas
                  </h3>
                </div>
                <p className="relative z-10 text-slate-300 text-sm leading-relaxed">
                  Cuando llega una visita de inspección de la AeroCivil, abres Bitafly y
                  exportas en segundos los reportes solicitados con la cabecera corporativa de
                  tu organización. Sin Excels dispersos. Sin papeles perdidos.
                </p>
                <div className="relative z-10 border-t border-white/10 pt-6 space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-primary">
                    Reportes RAC 100 generados
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

          {/* ==================== POR QUÉ ELEGIR BITAFLY ==================== */}
          {/* Antes: "Testimonios" con citas atribuidas a un "Cliente Bitafly"
              genérico (ícono de persona + rol/ciudad inventados) y 5 estrellas
              — no eran reseñas reales de ningún cliente. Se reformula como
              razones de la plataforma, sin fingir ser una reseña de alguien
              que no existe. Ver Fase 5 del plan de mejora visual — los casos
              de éxito reales (cuando existan) viven en /casos, no aquí. */}
          <section className="py-24 px-6 bg-white" aria-labelledby="porque-heading">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-14 space-y-3">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-primary">Por qué Bitafly</p>
                <h2 id="porque-heading" className="text-3xl md:text-4xl font-black text-navy uppercase tracking-tighter">
                  Pensado para <span className="text-primary">operadores UAS</span> en Colombia
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    icon: 'gavel',
                    title: 'Auditorías sin sorpresas',
                    text: 'Los reportes PDF (F-OPS-002, F-MNT-003, F-HUM-005 y +20 formatos más) traen exactamente los campos que pide un inspector de la AeroCivil.',
                  },
                  {
                    icon: 'battery_alert',
                    title: 'Cero ciclos de batería perdidos',
                    text: 'Alertas automáticas de mantenimiento mayor, menor y ciclos de batería — sin depender de una hoja de Excel que alguien olvidó actualizar.',
                  },
                  {
                    icon: 'bolt',
                    title: 'Configuración en minutos, no semanas',
                    text: 'Sin instalación, sin servidor propio, sin curva de aprendizaje larga. Soporte en español para todo el proceso de onboarding.',
                  },
                ].map((f) => (
                  <div key={f.title} className="bg-slate-50 border border-slate-100 rounded-3xl p-8 flex flex-col gap-4">
                    <div className="size-11 bg-orange-50 rounded-2xl flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-2xl">{f.icon}</span>
                    </div>
                    <h3 className="font-black text-navy text-base uppercase tracking-tight">{f.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{f.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ==================== PRECIOS ==================== */}
          <Pricing />

          {/* ==================== FAQ ==================== */}
          <section id="faq" className="py-24 px-6 bg-white">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16 space-y-4">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-primary">
                  Preguntas frecuentes
                </p>
                <h2 className="text-3xl md:text-5xl font-black text-navy uppercase tracking-tighter">
                  Resolvemos tus <span className="text-primary">dudas</span>
                </h2>
                <p className="text-slate-500 max-w-2xl mx-auto">
                  Desde planes y precios hasta capacitación, proveedores y evaluación de
                  riesgos — todo lo que necesitas saber antes de empezar.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-12">
                {FAQ_GROUPS.map((group) => {
                  const groupFaqs = FAQS.filter((f) => f.group === group);
                  if (!groupFaqs.length) return null;
                  return (
                    <div key={group} className="space-y-4">
                      <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
                        <span className="material-symbols-outlined text-base">
                          {{
                            'Plataforma y planes': 'apps',
                            'Cumplimiento RAC 100': 'gavel',
                            'Módulos avanzados': 'auto_awesome',
                            'Datos y seguridad': 'shield_lock',
                          }[group]}
                        </span>
                        {group}
                      </h3>
                      <div className="space-y-3">
                        {groupFaqs.map((f, i) => (
                          <details
                            key={i}
                            className="group bg-[#f8f6f6] rounded-2xl border border-slate-100 overflow-hidden"
                          >
                            <summary className="flex items-center justify-between gap-3 p-5 cursor-pointer list-none">
                              <h4 className="font-black text-navy text-sm pr-4">
                                {f.q}
                              </h4>
                              <span className="material-symbols-outlined text-primary text-xl group-open:rotate-180 transition-transform shrink-0">
                                expand_more
                              </span>
                            </summary>
                            <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">
                              {f.a}
                            </div>
                          </details>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ==================== CONTACTO ==================== */}
          <Contact />

          {/* ==================== CTA FINAL ==================== */}
          <section className="relative isolate overflow-hidden py-24 px-6 bg-navy text-white">
            <Decor variant="dark" />
            <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
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
                  href="#contacto"
                  className="border-2 border-white/20 px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest text-white hover:bg-white/5 transition-all"
                >
                  Hablar con ventas
                </a>
              </div>
            </div>
          </section>
        </main>

        {/* ==================== FOOTER ==================== */}
        <SEOFooter brandDesc="Software de gestión aeronáutica para operadores UAS en Colombia. Cumplimiento RAC 100 desde el primer vuelo." />
      </div>
    </>
  );
}
