import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';
import Decor from '@/components/landing/Decor';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com').replace(/\/$/, '');

export const metadata = {
  title: 'Bitafly vs Dronedesk: ¿cuál es mejor en Colombia?',
  description:
    'Comparativa entre Bitafly y Dronedesk para operadores de drones en Colombia. Cumplimiento RAC 100 nativo, formatos AeroCivil, soporte en español y precios en pesos colombianos frente a una plataforma diseñada para el Reino Unido.',
  keywords: [
    'bitafly vs dronedesk',
    'alternativa dronedesk colombia',
    'dronedesk en español',
    'software drones colombia',
    'mejor plataforma uas colombia',
    'gestion drones rac 100',
  ],
  alternates: { canonical: '/comparativa-bitafly-dronedesk' },
  openGraph: {
    title: 'Bitafly vs Dronedesk — Comparativa para Colombia | Bitafly',
    description:
      'Dronedesk es una plataforma sólida, pero está diseñada para la CAA del Reino Unido. Bitafly está hecho desde cero para la RAC 100 de la Aerocivil colombiana.',
    url: `${SITE_URL}/comparativa-bitafly-dronedesk`,
    type: 'website',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Sirve Dronedesk para cumplir la RAC 100 en Colombia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Dronedesk es una plataforma británica diseñada en torno a la normativa de la CAA del Reino Unido. No incluye los reportes que exige la RAC 100 colombiana (bitácora, baterías, libro de piloto, solicitud de autorización), ni el SMS aeronáutico exigido por la UAEAC. Bitafly cubre estos requerimientos de forma nativa porque está construido específicamente para operadores UAS en Colombia, y permite usar el código de formato que defina tu manual (F-OPS-001, F-OPS-002 por defecto).',
      },
    },
    {
      '@type': 'Question',
      name: '¿Bitafly está en español y con precios en pesos colombianos?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí. Bitafly es 100% en español, con soporte en zona horaria de Colombia y precios públicos en pesos colombianos (COP) desde $20.000 COP/mes. Dronedesk opera en inglés y maneja sus tarifas en libras esterlinas (GBP), lo que añade conversión de moneda y barrera de idioma.',
      },
    },
    {
      '@type': 'Question',
      name: '¿En qué es fuerte Dronedesk frente a Bitafly?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Dronedesk tiene una planificación de vuelo y verificación de espacio aéreo muy maduras, además de gestión de clientes y trabajos (CRM) orientada al mercado europeo. Bitafly se enfoca en el cumplimiento normativo colombiano: bitácora RAC 100, autorizaciones AeroCivil, SMS, SORA, sincronización DJI y replay GPS. Si tu prioridad es operar legalmente en Colombia, Bitafly encaja mejor.',
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
      name: 'Bitafly vs Dronedesk',
      item: `${SITE_URL}/comparativa-bitafly-dronedesk`,
    },
  ],
};

const ROWS = [
  { feature: 'Cumplimiento RAC 100 (UAEAC)',           bitafly: '✅ Nativo',                            competitor: '❌ Diseñado para CAA Reino Unido' },
  { feature: 'Reportes RAC 100 (F-OPS-001/002)',       bitafly: '✅ Incluidos',                          competitor: '❌ No disponible' },
  { feature: 'Idioma español',                          bitafly: '✅ 100% en español',                   competitor: '❌ Solo inglés' },
  { feature: 'Precios en pesos colombianos (COP)',      bitafly: '✅ Desde $20.000 COP/mes',             competitor: '❌ En libras (GBP)' },
  { feature: 'SMS aeronáutico completo',                bitafly: '✅ Con trazabilidad',                  competitor: '⚠️ Enfoque europeo' },
  { feature: 'Análisis SORA',                           bitafly: '✅ Incluido',                          competitor: '⚠️ Marco JARUS europeo' },
  { feature: 'Sincronización DJI automática',           bitafly: '✅ Sí',                                competitor: '⚠️ Importación manual' },
  { feature: 'Replay GPS de vuelos',                    bitafly: '✅ Incluido',                          competitor: '❌ No disponible' },
  { feature: 'Planificación de vuelo y espacio aéreo',  bitafly: '✅ Mapa + zonas + KMZ',                competitor: '✅ Mapa aéreo (Reino Unido)' },
  { feature: 'Gestión de clientes / trabajos (CRM)',    bitafly: '⚠️ Enfocado en cumplimiento',          competitor: '✅ Incluido' },
  { feature: 'Soporte en zona horaria de Colombia',     bitafly: '✅ Chat + email',                      competitor: '❌ Horario Reino Unido' },
  { feature: 'Prueba gratis',                           bitafly: '✅ 15 días sin tarjeta',              competitor: '✅ Plan gratuito limitado' },
];

const REASONS = [
  {
    icon: 'verified',
    title: 'Hecho para la RAC 100 colombiana',
    description:
      'Bitafly nace de la normativa de la Aerocivil / UAEAC: bitácora RAC 100, autorizaciones F-OPS-001, reportes F-OPS-002 y SMS aeronáutico nativos. Dronedesk está pensado para la CAA del Reino Unido, no para Colombia.',
  },
  {
    icon: 'translate',
    title: 'Español y pesos colombianos',
    description:
      'Toda la plataforma, el soporte y la facturación están en español y en COP. Sin barreras de idioma ni conversión de libras, y con atención en tu misma zona horaria.',
  },
  {
    icon: 'sync',
    title: 'Sincronización automática con DJI',
    description:
      'Importa los archivos de tu controladora DJI y Bitafly crea la entrada de bitácora, actualiza las horas de vuelo y los ciclos de batería automáticamente, además de generar el replay GPS del vuelo.',
  },
];

export default function ComparativaDronedeskPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <SEONav />

      {/* HERO */}
      <section className="relative overflow-hidden isolate bg-navy text-white py-20 px-6">
        <Decor variant="dark" />
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block text-xs font-black uppercase tracking-widest text-orange-400 mb-4">
            Comparativa · Colombia
          </span>
          <h1 className="font-lexend text-3xl md:text-5xl font-black uppercase tracking-tighter leading-tight mb-6">
            Bitafly vs Dronedesk:<br />
            <span className="text-orange-400">cuál conviene a un operador UAS en Colombia</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            Dronedesk es una plataforma sólida, pero está diseñada para el{' '}
            <strong className="text-white">Reino Unido</strong>. Bitafly está hecho desde cero para la{' '}
            <strong className="text-white">RAC 100 de la Aerocivil</strong>.
          </p>
          <Link
            href="/registro"
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-orange-600 transition-colors shadow-xl shadow-orange-900/30"
          >
            Comenzar gratis 15 días
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </div>
      </section>

      {/* TABLA COMPARATIVA */}
      <section className="relative overflow-hidden isolate py-20 px-6 bg-[#f8f6f6]">
        <Decor variant="light" />
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
              <div className="p-5 text-center border-l border-white/10 text-slate-400">Dronedesk</div>
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
            Comparativa basada en funciones disponibles públicamente en junio de 2026. Dronedesk es marca de Dronedesk Ltd. (Reino Unido).
          </p>
        </div>
      </section>

      {/* POR QUÉ ELEGIR BITAFLY */}
      <section className="relative overflow-hidden isolate py-20 px-6 bg-white">
        <Decor variant="light" />
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-black uppercase tracking-widest text-orange-600 mb-3">
              Por qué elegir Bitafly
            </p>
            <h2 className="font-lexend text-2xl md:text-4xl font-black uppercase tracking-tight text-navy">
              ¿Por qué elegir Bitafly sobre Dronedesk?
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
      <section className="relative overflow-hidden isolate py-20 px-6 bg-[#f8f6f6]">
        <Decor variant="light" />
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
      <section className="relative overflow-hidden isolate py-20 px-6 bg-navy text-white">
        <Decor variant="dark" />
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-black uppercase tracking-widest text-orange-400 mb-4">
            Pruébalo sin riesgo
          </p>
          <h2 className="font-lexend text-2xl md:text-4xl font-black uppercase tracking-tighter mb-5 leading-tight">
            Comienza gratis 15 días
          </h2>
          <p className="text-slate-300 text-base leading-relaxed mb-8 max-w-xl mx-auto">
            Sin tarjeta de crédito. Sin compromisos. Registra tus drones, sube tus vuelos DJI
            y genera tu primera bitácora RAC 100 en minutos.
          </p>
          <Link
            href="/registro"
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-orange-600 transition-colors shadow-xl shadow-orange-900/40"
          >
            Comenzar gratis 15 días
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </div>
      </section>

      <SEOFooter />
    </>
  );
}
