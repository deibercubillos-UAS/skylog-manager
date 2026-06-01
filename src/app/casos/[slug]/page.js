import { notFound } from 'next/navigation';
import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';
import { CASE_STUDIES, getCaseBySlug, getAllCaseSlugs } from '@/lib/caseStudies';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com').replace(/\/$/, '');

export function generateStaticParams() {
  return getAllCaseSlugs();
}

export function generateMetadata({ params }) {
  const c = getCaseBySlug(params.slug);
  if (!c) return {};
  return {
    title:       c.metaTitle,
    description: c.metaDescription,
    keywords:    c.keywords,
    alternates:  { canonical: `/casos/${c.slug}` },
    openGraph: {
      title:       c.metaTitle,
      description: c.metaDescription,
      url:         `${SITE_URL}/casos/${c.slug}`,
      type:        'article',
      publishedTime: c.publishedAt,
    },
  };
}

const MODULE_HREF = {
  'bitacora-digital':        '/bitacora-digital',
  'gestion-flota-drones':    '/gestion-flota-drones',
  'mantenimiento-drones':    '/mantenimiento-drones',
  'reportes-auditoria':      '/reportes-auditoria',
  'sms-aeronautico':         '/sms-aeronautico',
  'gestion-pilotos':         '/gestion-pilotos',
  'autorizaciones-aerocivil':'/autorizaciones-aerocivil',
  'sora':                    '/sora',
};
const MODULE_LABEL = {
  'bitacora-digital':        'Bitácora Digital',
  'gestion-flota-drones':    'Gestión de Flota',
  'mantenimiento-drones':    'Mantenimiento',
  'reportes-auditoria':      'Reportes AeroCivil',
  'sms-aeronautico':         'SMS Aeronáutico',
  'gestion-pilotos':         'Gestión de Pilotos',
  'autorizaciones-aerocivil':'Autorizaciones AeroCivil',
  'sora':                    'Análisis SORA',
};

export default function CasoPage({ params }) {
  const c = getCaseBySlug(params.slug);
  if (!c) notFound();

  // Schema CaseStudy (Article type con mentions de las herramientas)
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${SITE_URL}/casos/${c.slug}#article`,
    headline: `${c.empresa} — Caso de Éxito Bitafly`,
    description: c.metaDescription,
    datePublished: c.publishedAt,
    dateModified:  c.publishedAt,
    author: { '@type': 'Organization', name: 'Bitafly', url: SITE_URL },
    publisher: { '@id': `${SITE_URL}/#organization` },
    about: {
      '@type': 'Organization',
      name: c.empresa,
      address: {
        '@type': 'PostalAddress',
        addressLocality: c.ciudad.split(',')[0],
        addressCountry: 'CO',
      },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/casos/${c.slug}` },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio',         item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Casos de Éxito', item: `${SITE_URL}/casos` },
      { '@type': 'ListItem', position: 3, name: c.empresa,        item: `${SITE_URL}/casos/${c.slug}` },
    ],
  };

  // Other cases for related section
  const related = CASE_STUDIES.filter(cs => cs.slug !== c.slug);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <SEONav />

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-8">
          <Link href="/" className="hover:text-orange-600 transition-colors">Inicio</Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <Link href="/casos" className="hover:text-orange-600 transition-colors">Casos de Éxito</Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-slate-600 truncate">{c.empresa}</span>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className="bg-orange-50 text-orange-700 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full">
              Caso de Éxito
            </span>
            <span className="text-xs text-slate-400">{c.ciudad}</span>
            <span className="text-xs text-slate-300">· {c.tipo}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-navy leading-tight mb-2">
            {c.empresa}
          </h1>
          <p className="text-slate-400 text-sm font-medium mb-6">
            {c.operador}, {c.cargo} · {c.flota} · Usando Bitafly desde {c.desde}
          </p>
          {/* Quote destacada */}
          <blockquote className="bg-orange-50 border-l-4 border-orange-500 rounded-r-2xl px-6 py-5">
            <p className="text-slate-700 text-base leading-relaxed italic font-medium">
              "{c.quote}"
            </p>
            <footer className="mt-3 text-xs font-black text-orange-600 uppercase tracking-widest">
              — {c.operador}, {c.cargo}
            </footer>
          </blockquote>
        </header>

        {/* Módulos usados */}
        <section className="mb-10">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Módulos utilizados</p>
          <div className="flex flex-wrap gap-2">
            {c.modulos.map(m => (
              <Link
                key={m}
                href={MODULE_HREF[m] ?? '/'}
                className="bg-navy text-white text-xs font-black px-3 py-1.5 rounded-full hover:bg-orange-600 transition-colors"
              >
                {MODULE_LABEL[m] ?? m}
              </Link>
            ))}
          </div>
        </section>

        {/* El reto */}
        <section className="mb-8">
          <h2 className="text-xl font-black uppercase tracking-tight text-navy mb-3">El reto</h2>
          <p className="text-slate-600 text-sm leading-relaxed">{c.reto}</p>
        </section>

        {/* La solución */}
        <section className="mb-8">
          <h2 className="text-xl font-black uppercase tracking-tight text-navy mb-3">La solución con Bitafly</h2>
          <p className="text-slate-600 text-sm leading-relaxed">{c.solucion}</p>
        </section>

        {/* Resultados */}
        <section className="mb-10">
          <h2 className="text-xl font-black uppercase tracking-tight text-navy mb-4">Resultados</h2>
          <ul className="space-y-3">
            {c.resultados.map((r, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="material-symbols-outlined text-green-500 text-base shrink-0 mt-0.5">check_circle</span>
                <span className="text-slate-600 text-sm leading-relaxed">{r}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <div className="bg-navy text-white rounded-3xl p-8 text-center mb-10">
          <p className="text-xs font-black uppercase tracking-widest text-orange-400 mb-2">Tu operación puede ser la próxima</p>
          <h2 className="text-xl font-black uppercase tracking-tight mb-3">
            Gestiona tu flota como {c.empresa}
          </h2>
          <p className="text-slate-300 text-sm mb-5">
            Bitácora RAC 100, mantenimiento, SMS y autorizaciones AeroCivil. Plan gratuito por 6 meses.
          </p>
          <Link
            href="/registro"
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-colors"
          >
            Comenzar gratis
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>

        {/* Otros casos */}
        {related.length > 0 && (
          <section>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Más casos de éxito</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {related.map(r => (
                <Link
                  key={r.slug}
                  href={`/casos/${r.slug}`}
                  className="group border border-slate-100 rounded-2xl p-5 hover:border-orange-200 hover:shadow-sm transition-all bg-white"
                >
                  <p className="text-xs text-slate-400 mb-1">{r.ciudad}</p>
                  <h3 className="text-sm font-black uppercase tracking-tight text-navy group-hover:text-orange-600 transition-colors">
                    {r.empresa}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{r.tipo}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Back */}
        <div className="mt-10 pt-6 border-t border-slate-100">
          <Link href="/casos" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-orange-600 transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Todos los casos
          </Link>
        </div>
      </main>

      <SEOFooter />
    </>
  );
}
