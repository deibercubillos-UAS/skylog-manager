import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com').replace(/\/$/, '');

export const metadata = {
  title: 'Bitafly vs GEODRONE: ¿cuál es mejor para drones en Colombia?',
  description:
    'Comparativa entre Bitafly y GEODRONE (Tecnidrones) para operadores de drones en Colombia. Precios transparentes, prueba gratis 30 días, sincronización DJI y cumplimiento RAC 100 completo.',
  keywords: [
    'bitafly vs geodrone',
    'alternativa geodrone colombia',
    'geodrone tecnidrones comparativa',
    'software drones colombia',
    'mejor plataforma uas colombia',
    'gestion drones colombia',
  ],
  alternates: { canonical: '/comparativa-bitafly-geodrone' },
  openGraph: {
    title: 'Bitafly vs GEODRONE — Comparativa para Colombia | Bitafly',
    description:
      'Ambos son software colombiano para drones. Pero hay diferencias importantes en precio, funcionalidades RAC 100 y soporte.',
    url: `${SITE_URL}/comparativa-bitafly-geodrone`,
    type: 'website',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Es Bitafly mejor que GEODRONE para cumplir la RAC 100?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Bitafly incluye bitácora RAC 100 ilimitada (F-OPS-002 por defecto), autorizaciones AeroCivil (F-OPS-001 por defecto), SMS aeronáutico completo con trazabilidad, análisis SORA y reportes RAC 100 con tu propio código de formato. GEODRONE ofrece funcionalidades parciales en estas áreas. Si tu operación debe cumplir plenamente la normativa de la UAEAC / Aerocivil, Bitafly cubre todos los requerimientos de forma nativa.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Cuánto cuesta Bitafly comparado con GEODRONE?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Bitafly tiene precios públicos desde $20.000 COP/mes para el plan piloto autónomo. GEODRONE (Tecnidrones) no publica sus tarifas — debes contactarlos para obtener una cotización. Con Bitafly sabes exactamente cuánto pagarás antes de registrarte.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Puedo probar Bitafly antes de pagar?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí. Bitafly ofrece 30 días de prueba gratuita sin necesidad de tarjeta de crédito. Puedes registrar tus aeronaves, importar vuelos DJI y generar tu primera bitácora RAC 100 sin ningún costo ni compromiso.',
      },
    },
  ],
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Bitafly vs GEODRONE',
      item: `${SITE_URL}/comparativa-bitafly-geodrone`,
    },
  ],
};

const ROWS = [
  { feature: 'Precio público visible',               bitafly: '✅ Desde $20.000 COP/mes',                    competitor: '❌ Sin precios públicos' },
  { feature: 'Prueba gratis',                         bitafly: '✅ 30 días sin tarjeta',                      competitor: '❌ No disponible' },
  { feature: 'Bitácora RAC 100 (F-OPS-002)',          bitafly: '✅ Ilimitada',                                competitor: '⚠️ Limitada' },
  { feature: 'Autorizaciones AeroCivil (F-OPS-001)', bitafly: '✅ Incluido',                                 competitor: '⚠️ Parcial' },
  { feature: 'SMS aeronáutico completo',              bitafly: '✅ Con trazabilidad',                         competitor: '⚠️ Básico' },
  { feature: 'Análisis SORA',                         bitafly: '✅ Incluido',                                 competitor: '❌ No disponible' },
  { feature: 'Sincronización DJI automática',         bitafly: '✅ Sí',                                       competitor: '❌ No' },
  { feature: 'Replay GPS de vuelos',                  bitafly: '✅ Incluido',                                 competitor: '❌ No disponible' },
  { feature: 'Reportes PDF RAC 100',                  bitafly: '✅ F-OPS-002, F-MNT-003, F-HUM-005',         competitor: '⚠️ Básicos' },
  { feature: 'Acceso web (sin instalación)',           bitafly: '✅ 100% web',                                 competitor: '⚠️ Requiere instalación' },
  { feature: 'Soporte en español',                    bitafly: '✅ Chat + email',                             competitor: '⚠️ Solo email' },
  { feature: 'Multi-usuario y roles',                 bitafly: '✅ Hasta 5 roles',                            competitor: '⚠️ Limitado' },
];

const REASONS = [
  {
    icon: 'price_check',
    title: 'Precio transparente desde $20.000 COP',
    description:
      'Con Bitafly sabes exactamente cuánto vas a pagar antes de registrarte. Sin cotizaciones, sin llamadas comerciales. El plan más accesible está pensado para el piloto autónomo colombiano.',
  },
  {
    icon: 'rocket_launch',
    title: 'Prueba gratis 30 días sin tarjeta',
    description:
      'Regístrate, conecta tus drones e importa tus vuelos DJI sin entregar ningún dato de pago. Solo pagas si decides continuar — y solo si ves el valor.',
  },
  {
    icon: 'sync',
    title: 'Sincronización automática con DJI',
    description:
      'Importa los archivos de registro de tu controladora DJI y Bitafly crea la entrada de bitácora, actualiza las horas de vuelo y los ciclos de batería de forma automática. Sin doble captura.',
  },
];

export default function ComparativaGeodronePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <SEONav />

      {/* HERO */}
      <section className="bg-navy text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block text-xs font-black uppercase tracking-widest text-orange-400 mb-4">
            Comparativa · Colombia
          </span>
          <h1 className="font-lexend text-3xl md:text-5xl font-black uppercase tracking-tighter leading-tight mb-6">
            Bitafly vs GEODRONE:<br />
            <span className="text-orange-400">comparativa honesta para operadores UAS en Colombia</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            Ambos son software colombiano para drones. Pero hay diferencias importantes en{' '}
            <strong className="text-white">precio, funcionalidades RAC 100</strong> y soporte.
          </p>
          <Link
            href="/registro"
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-orange-600 transition-colors shadow-xl shadow-orange-900/30"
          >
            Comenzar gratis 30 días
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </div>
      </section>

      {/* TABLA COMPARATIVA */}
      <section className="py-20 px-6 bg-[#f8f6f6]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-widest text-orange-600 mb-3">
              Comparativa de funciones
            </p>
            <h2 className="font-lexend text-2xl md:text-4xl font-black uppercase tracking-tight text-navy">
              Función a función
            </h2>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 bg-navy text-white text-xs font-black uppercase tracking-widest">
              <div className="p-5">Característica</div>
              <div className="p-5 text-center border-l border-white/10 text-orange-400">Bitafly</div>
              <div className="p-5 text-center border-l border-white/10 text-slate-400">GEODRONE</div>
            </div>
            {/* Rows */}
            {ROWS.map((r, i) => (
              <div
                key={i}
                className={`grid grid-cols-3 border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
              >
                <div className="p-4 pl-5 flex items-center text-sm font-medium text-navy">{r.feature}</div>
                <div
                  className={`p-4 flex items-center justify-center text-xs font-bold border-l border-slate-100 ${
                    r.bitafly.startsWith('✅') ? 'text-green-700' : r.bitafly.startsWith('❌') ? 'text-red-600' : 'text-slate-600'
                  }`}
                >
                  {r.bitafly}
                </div>
                <div
                  className={`p-4 flex items-center justify-center text-xs font-bold border-l border-slate-100 ${
                    r.competitor.startsWith('✅') ? 'text-green-700' : r.competitor.startsWith('❌') ? 'text-red-600' : 'text-slate-500'
                  }`}
                >
                  {r.competitor}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 text-center mt-4">
            Comparativa basada en funciones disponibles públicamente en junio de 2026. GEODRONE es marca de Tecnidrones Colombia.
          </p>
        </div>
      </section>

      {/* POR QUÉ ELEGIR BITAFLY */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-black uppercase tracking-widest text-orange-600 mb-3">
              Por qué elegir Bitafly
            </p>
            <h2 className="font-lexend text-2xl md:text-4xl font-black uppercase tracking-tight text-navy">
              ¿Por qué elegir Bitafly sobre GEODRONE?
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {REASONS.map(reason => (
              <article
                key={reason.title}
                className="bg-[#f8f6f6] rounded-3xl p-8 border border-slate-100 hover:border-orange-200 hover:shadow-md transition-all"
              >
                <div className="size-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-5">
                  <span className="material-symbols-outlined text-orange-500 text-2xl">{reason.icon}</span>
                </div>
                <h3 className="font-lexend text-base font-black uppercase tracking-tight text-navy mb-3 leading-snug">
                  {reason.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">{reason.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-[#f8f6f6]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-widest text-orange-600 mb-3">
              Preguntas frecuentes
            </p>
            <h2 className="font-lexend text-2xl md:text-3xl font-black uppercase tracking-tight text-navy">
              Resolvemos tus dudas
            </h2>
          </div>

          <div className="space-y-4">
            {faqSchema.mainEntity.map((q, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <h3 className="text-sm font-black text-navy mb-3 leading-snug">{q.name}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{q.acceptedAnswer.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 px-6 bg-navy text-white">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-black uppercase tracking-widest text-orange-400 mb-4">
            Pruébalo sin riesgo
          </p>
          <h2 className="font-lexend text-2xl md:text-4xl font-black uppercase tracking-tighter mb-5 leading-tight">
            Comienza gratis 30 días
          </h2>
          <p className="text-slate-300 text-base leading-relaxed mb-8 max-w-xl mx-auto">
            Sin tarjeta de crédito. Sin compromisos. Registra tus drones, sube tus vuelos DJI
            y genera tu primera bitácora RAC 100 en minutos.
          </p>
          <Link
            href="/registro"
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-orange-600 transition-colors shadow-xl shadow-orange-900/40"
          >
            Comenzar gratis 30 días
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </div>
      </section>

      <SEOFooter />
    </>
  );
}
