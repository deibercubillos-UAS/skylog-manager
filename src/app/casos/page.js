import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';
import { CASE_STUDIES } from '@/lib/caseStudies';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com').replace(/\/$/, '');

export const metadata = {
  title: 'Casos de Éxito — Operadores de Drones en Colombia',
  description: 'Descubre cómo operadores UAS en Bogotá, Medellín y Cali gestionan su flota, cumplen la RAC 100 y obtienen la certificación ESUAS con Bitafly.',
  alternates: { canonical: '/casos' },
  openGraph: {
    title: 'Casos de Éxito Bitafly — Operadores de Drones en Colombia',
    description: 'Historias reales de operadores UAS que usan Bitafly para cumplir la RAC 100 colombiana.',
    url: `${SITE_URL}/casos`,
    type: 'website',
  },
};

const TIPO_COLOR = {
  'Empresa de inspección y topografía': { bg: 'bg-blue-50',   text: 'text-blue-700'   },
  'Producción audiovisual y publicidad con drones': { bg: 'bg-purple-50', text: 'text-purple-700' },
  'Aplicaciones agrícolas — fumigación y monitoreo': { bg: 'bg-green-50', text: 'text-green-700' },
};

const MODULE_LABEL = {
  'bitacora-digital':       'Bitácora',
  'gestion-flota-drones':   'Flota',
  'mantenimiento-drones':   'Mantenimiento',
  'reportes-auditoria':     'Reportes',
  'sms-aeronautico':        'SMS',
  'gestion-pilotos':        'Pilotos',
  'autorizaciones-aerocivil':'Autorizaciones',
  'sora':                   'SORA',
};

// ItemList schema for Google
function buildItemListSchema(cases) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Casos de Éxito — Operadores UAS Colombia con Bitafly',
    url: `${SITE_URL}/casos`,
    numberOfItems: cases.length,
    itemListElement: cases.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/casos/${c.slug}`,
      name: `${c.empresa} — ${c.ciudad}`,
    })),
  };
}

export default function CasosPage() {
  const schema = buildItemListSchema(CASE_STUDIES);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <SEONav />

      {/* HERO */}
      <section className="bg-navy text-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block text-xs font-black uppercase tracking-widest text-orange-400 mb-4">
            Casos de éxito
          </span>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight leading-tight mb-4">
            Operadores que ya <span className="text-orange-400">cumplen la RAC 100</span> con Bitafly
          </h1>
          <p className="text-slate-300 text-base max-w-xl mx-auto leading-relaxed">
            Historias reales de empresas y pilotos en Colombia que gestionan su flota, bitácoras
            y certificaciones con Bitafly.
          </p>
        </div>
      </section>

      {/* CASOS */}
      <div className="max-w-4xl mx-auto px-6 py-14 space-y-8">
        {CASE_STUDIES.map(c => {
          const tc = TIPO_COLOR[c.tipo] ?? { bg: 'bg-slate-50', text: 'text-slate-600' };
          return (
            <Link
              key={c.slug}
              href={`/casos/${c.slug}`}
              className="group block bg-white border border-slate-100 rounded-3xl p-8 hover:shadow-lg hover:border-orange-100 transition-all"
            >
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${tc.bg} ${tc.text}`}>
                  {c.tipo}
                </span>
                <span className="text-xs text-slate-400 font-medium">{c.ciudad}</span>
                <span className="text-xs text-slate-300">· desde {c.desde}</span>
              </div>

              <h2 className="text-2xl font-black uppercase tracking-tight text-navy mb-1 group-hover:text-orange-600 transition-colors">
                {c.empresa}
              </h2>
              <p className="text-sm text-slate-400 font-medium mb-4">
                {c.operador} — {c.cargo} · {c.flota}
              </p>

              <blockquote className="border-l-4 border-orange-400 pl-4 mb-5">
                <p className="text-slate-600 text-sm leading-relaxed italic">"{c.quote}"</p>
              </blockquote>

              <div className="flex flex-wrap gap-2">
                {c.modulos.map(m => (
                  <span key={m} className="bg-orange-50 text-orange-700 text-xs font-black px-2.5 py-1 rounded-full">
                    {MODULE_LABEL[m] ?? m}
                  </span>
                ))}
              </div>

              <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-orange-600 mt-4">
                Leer caso completo
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </span>
            </Link>
          );
        })}

        {/* CTA */}
        <div className="bg-orange-50 border border-orange-100 rounded-3xl p-8 text-center mt-6">
          <p className="text-xs font-black uppercase tracking-widest text-orange-600 mb-3">¿Quieres aparecer aquí?</p>
          <h2 className="text-xl font-black uppercase tracking-tight text-navy mb-3">
            Comparte tu historia con Bitafly
          </h2>
          <p className="text-slate-500 text-sm mb-5 max-w-md mx-auto">
            Si eres operador UAS en Colombia y usas Bitafly, nos encantaría publicar tu caso de éxito.
            Contáctanos y lo preparamos juntos.
          </p>
          <a
            href="mailto:soporte@bitafly.com?subject=Quiero compartir mi caso de éxito con Bitafly"
            className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orange-700 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">mail</span>
            Enviar mi historia
          </a>
        </div>
      </div>

      <SEOFooter />
    </>
  );
}
