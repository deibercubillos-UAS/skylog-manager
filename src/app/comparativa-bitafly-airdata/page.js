import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';
import Decor from '@/components/landing/Decor';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com').replace(/\/$/, '');

export const metadata = {
  title: 'Bitafly vs AirData UAV: ¿cuál es mejor en Colombia?',
  description:
    'Comparativa entre Bitafly y AirData UAV para operadores de drones en Colombia. Bitafly es nativo RAC 100, con precios en COP, soporte en español y trámites AeroCivil incluidos.',
  keywords: ['bitafly vs airdata', 'alternativa airdata colombia', 'airdata uav colombia', 'software drones colombia comparativa', 'mejor plataforma drones colombia'],
  alternates: { canonical: '/comparativa-bitafly-airdata' },
  openGraph: {
    title: 'Bitafly vs AirData UAV — Comparativa para Colombia | Bitafly',
    description:
      'AirData es una herramienta global. Bitafly está hecho para la RAC 100 colombiana. Compara características, precios y soporte.',
    url: `${SITE_URL}/comparativa-bitafly-airdata`,
    type: 'website',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Bitafly reemplaza completamente a AirData UAV para operadores en Colombia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Para operadores que deben cumplir con la RAC 100 (Aerocivil / UAEAC), Bitafly ofrece funcionalidades que AirData no tiene: bitácora en formato F-OPS-002, autorizaciones de vuelo F-OPS-001, SMS aeronáutico y análisis SORA. Ambas plataformas sincronizan vuelos DJI y tienen replay GPS, pero solo Bitafly está adaptado a la normativa colombiana.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Cuánto cuesta Bitafly comparado con AirData UAV?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'El plan base de Bitafly es $20.000 COP/mes (aproximadamente USD 5), mientras que AirData UAV cobra desde USD 36/mes (~$150.000 COP). Además, Bitafly factura en pesos colombianos, eliminando la variabilidad del TRM.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Bitafly funciona con drones DJI igual que AirData?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí. Bitafly permite importar los archivos de registro DJI (.txt) para crear entradas de bitácora automáticamente, actualizar horas de vuelo y ciclos de baterías. Adicionalmente, ofrece replay GPS animado de las trayectorias de vuelo.',
      },
    },
  ],
};

const accent = '#ec5b13';

const ROWS = [
  { feature: 'Bitácora RAC 100 (F-OPS-002)',          bitafly: '✅ Nativo',                      airdata: '❌ No soporta' },
  { feature: 'Autorizaciones AeroCivil (F-OPS-001)',   bitafly: '✅ Incluido',                    airdata: '❌ No disponible' },
  { feature: 'SMS aeronáutico',                        bitafly: '✅ Completo',                    airdata: '❌ No disponible' },
  { feature: 'Reportes RAC 100 configurables',         bitafly: '✅ F-OPS-002, F-MNT-003, F-HUM-005', airdata: '❌ No' },
  { feature: 'Análisis SORA',                          bitafly: '✅ Incluido',                    airdata: '❌ No' },
  { feature: 'Idioma',                                 bitafly: '✅ Español',                     airdata: '⚠️ Inglés' },
  { feature: 'Precios en COP',                         bitafly: '✅ Sí',                          airdata: '❌ USD solamente' },
  { feature: 'Soporte en español',                     bitafly: '✅ 24h',                         airdata: '❌ No' },
  { feature: 'Sincronización DJI',                     bitafly: '✅ Sí',                          airdata: '✅ Sí' },
  { feature: 'Replay GPS',                             bitafly: '✅ Sí',                          airdata: '✅ Sí' },
  { feature: 'Precio base',                            bitafly: '✅ $20.000 COP/mes',             airdata: '❌ ~$150.000 COP/mes' },
];

const REASONS = [
  {
    icon: 'gavel',
    title: 'RAC 100 nativo desde el primer día',
    description:
      'Bitafly fue diseñado específicamente para cumplir la normativa colombiana. Bitácora, autorizaciones, SMS aeronáutico y reportes RAC 100 (con tu propio código de formato, F-OPS-002 y F-OPS-001 por defecto) están integrados — no son add-ons ni workarounds.',
  },
  {
    icon: 'payments',
    title: 'Precios en pesos colombianos',
    description:
      'Sin conversiones de moneda, sin sorpresas en la factura. Los planes de Bitafly se cobran en COP, con tarifas pensadas para el mercado colombiano. Desde $20.000 COP/mes para el piloto autónomo.',
  },
  {
    icon: 'support_agent',
    title: 'Soporte local en español',
    description:
      'Cuando tienes una duda sobre un trámite AeroCivil o un procedimiento RAC 100, necesitas respuestas en español y de alguien que entiende el contexto colombiano. Nuestro equipo responde en menos de 24h.',
  },
];

export default function ComparativaPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SEONav />

      {/* HERO */}
      <section className="relative overflow-hidden isolate bg-navy text-white py-20 px-6">
        <Decor variant="dark" />
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block text-xs font-black uppercase tracking-widest text-orange-400 mb-4">
            Comparativa · Colombia
          </span>
          <h1 className="font-lexend text-3xl md:text-5xl font-black uppercase tracking-tighter leading-tight mb-6">
            Bitafly vs AirData UAV:<br />
            <span className="text-orange-400">¿cuál es mejor para operar drones en Colombia?</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            AirData es una herramienta global. Bitafly está hecho para la{' '}
            <strong className="text-white">RAC 100 colombiana</strong> — con los formularios,
            trámites y normativa de Aerocivil integrados desde el primer día.
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
              <div className="p-5 text-center border-l border-white/10 text-slate-400">AirData UAV</div>
            </div>
            {/* Rows */}
            {ROWS.map((r, i) => (
              <div
                key={i}
                className={`grid grid-cols-3 border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
              >
                <div className="p-4 pl-5 flex items-center text-sm font-medium text-navy">{r.feature}</div>
                <div className={`p-4 flex items-center justify-center text-xs font-bold border-l border-slate-100 ${r.bitafly.startsWith('✅') ? 'text-green-700' : r.bitafly.startsWith('❌') ? 'text-red-600' : 'text-slate-600'}`}>
                  {r.bitafly}
                </div>
                <div className={`p-4 flex items-center justify-center text-xs font-bold border-l border-slate-100 ${r.airdata.startsWith('✅') ? 'text-green-700' : r.airdata.startsWith('❌') ? 'text-red-600' : 'text-slate-500'}`}>
                  {r.airdata}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 text-center mt-4">
            Comparativa basada en funciones disponibles en junio de 2026. Precios AirData UAV convertidos con TRM referencial.
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
              ¿Por qué los operadores colombianos eligen Bitafly?
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
