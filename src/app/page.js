import HomeClient from './HomeClient';

// Home real — Server Component. El diseño visual e interactivo vive en
// HomeClient.js (mismo patrón *Client.js ya usado en las 23 páginas públicas
// migradas: BitacoraDigitalClient, SmsClient, etc.) para que este archivo
// conserve el metadata/JSON-LD reales de producción (título, OpenGraph,
// canonical, y los 4 schemas de abajo) — un Client Component no puede
// exportar `metadata` en Next.js App Router.
//
// FAQS/FEATURES de abajo alimentan SOLO los schemas JSON-LD (structured
// data para Google) — el contenido visual real (condensado, con su propia
// redacción) vive en HomeClient.js. No hace falta que coincidan 1 a 1: son
// la misma información real del producto, presentada dos veces con
// distinto nivel de detalle (rich results vs. landing legible).

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com').replace(/\/$/, '');

// METADATA específico del landing (sobrescribe el global con copy de mayor densidad)
export const metadata = {
  title: 'Bitácora de Vuelo, SMS y Gestión de Flota de Drones | Bitafly',
  description: 'Plataforma SaaS para operadores UAS en Colombia: bitácora de vuelo digital, sistema de gestión de seguridad operacional (SMS), mantenimiento de drones y baterías, y revisión de vuelos con replay GPS. Cumple también con la RAC 100. Comienza gratis.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Bitafly | Bitácora de Vuelo, SMS y Gestión de Flota de Drones',
    description: 'Bitácora UAS, mantenimiento, sistema de gestión de seguridad operacional y revisión de vuelos en una sola plataforma. Diseñado para operadores de drones en Colombia.',
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
    'Plataforma SaaS para operadores UAS (drones) en Colombia. Bitácora de vuelo digital, sistema de gestión de seguridad operacional (SMS), mantenimiento de drones y baterías, revisión de vuelos con replay GPS, y autorizaciones AeroCivil. Cumple también con la RAC 100.',
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
  'name': 'Bitafly | Bitácora de Vuelo, SMS y Gestión de Flota de Drones en Colombia',
  'isPartOf': { '@id': `${SITE_URL}/#website` },
  'about': { '@id': `${SITE_URL}/#software` },
  'inLanguage': 'es-CO',
  'description': 'Plataforma SaaS para operadores UAS en Colombia: bitácora de vuelo digital, sistema de gestión de seguridad operacional (SMS), mantenimiento de drones y baterías, y revisión de vuelos con replay GPS. Cumple también con la RAC 100.',
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

      <HomeClient />
    </>
  );
}
