import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';
import NewsletterSignup from '@/components/NewsletterSignup';
import { BLOG_POSTS } from '@/lib/blogPosts';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com').replace(/\/$/, '');

function buildBlogSchemas(posts) {
  const sorted = [...posts].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${SITE_URL}/blog#webpage`,
      name: 'Blog Bitafly — Recursos para Operadores de Drones en Colombia',
      description: 'Guías, normativa y recursos para operadores RPAS en Colombia. RAC 100, trámites AeroCivil, SMS aeronáutico y gestión de flotas.',
      url: `${SITE_URL}/blog`,
      inLanguage: 'es-CO',
      isPartOf: { '@id': `${SITE_URL}/#website` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Artículos del Blog de Bitafly',
      url: `${SITE_URL}/blog`,
      numberOfItems: sorted.length,
      itemListElement: sorted.map((post, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/blog/${post.slug}`,
        name: post.title,
      })),
    },
  ];
}

export const metadata = {
  title: 'Blog de Drones en Colombia — RAC 100 y Normativa',
  description: 'Guías, normativa y recursos para operadores de drones en Colombia. RAC 100, registro UAEAC, SMS aeronáutico, SORA y más. Publicado por el equipo de Bitafly.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog Bitafly | Todo sobre drones en Colombia',
    description: 'Recursos para operadores RPAS en Colombia: normativa RAC 100, trámites AeroCivil, seguridad operacional y gestión de flotas.',
    url: `${SITE_URL}/blog`,
    type: 'website',
  },
};

// Category visual config
const CAT = {
  'Normativa':    { heroBg: 'bg-gradient-to-br from-blue-950 to-blue-800',    pill: 'bg-blue-50 text-blue-700',    bar: 'bg-gradient-to-r from-blue-600 to-blue-500' },
  'Operaciones':  { heroBg: 'bg-gradient-to-br from-slate-950 to-orange-900', pill: 'bg-orange-50 text-orange-700', bar: 'bg-gradient-to-r from-orange-600 to-orange-400' },
  'Trámites':     { heroBg: 'bg-gradient-to-br from-purple-950 to-purple-800',pill: 'bg-purple-50 text-purple-700', bar: 'bg-gradient-to-r from-purple-600 to-purple-500' },
  'Seguridad':    { heroBg: 'bg-gradient-to-br from-red-950 to-red-800',      pill: 'bg-red-50 text-red-700',      bar: 'bg-gradient-to-r from-red-600 to-red-500' },
  'Herramientas': { heroBg: 'bg-gradient-to-br from-emerald-950 to-emerald-800', pill: 'bg-green-50 text-green-700', bar: 'bg-gradient-to-r from-emerald-600 to-emerald-500' },
};

const CATEGORIES = ['Todos', 'Normativa', 'Operaciones', 'Trámites', 'Seguridad', 'Herramientas'];

// Reading time visual
function ReadingBadge({ minutes }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      {minutes} min
    </span>
  );
}

export default function BlogIndex() {
  const posts = [...BLOG_POSTS].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  const [featured, ...rest] = posts;
  const schemas = buildBlogSchemas(posts);

  // Group rest by 2: grid + list alternating
  const topGrid = rest.slice(0, 4);   // 2×2 grid
  const bottomList = rest.slice(4);   // remaining

  return (
    <>
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}
      <SEONav />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative bg-navy text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]" aria-hidden="true">
          <svg width="100%" height="100%"><defs><pattern id="hero-grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.5"/></pattern></defs><rect width="100%" height="100%" fill="url(#hero-grid)"/></svg>
        </div>
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl" aria-hidden="true"/>
        <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-20">
          <span className="inline-block text-xs font-black uppercase tracking-widest text-orange-400 mb-4">
            Blog Bitafly
          </span>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight leading-tight mb-4 max-w-2xl">
            Drones en Colombia:<br />
            <span className="text-orange-400">normativa, operaciones</span> y recursos
          </h1>
          <p className="text-slate-300 text-base max-w-xl leading-relaxed mb-8">
            Guías prácticas para operadores RPAS en Colombia. RAC 100, trámites AeroCivil,
            seguridad operacional y gestión de flotas — sin tecnicismos innecesarios.
          </p>
          {/* Stats strip */}
          <div className="flex flex-wrap gap-6">
            {[
              { n: posts.length, l: 'artículos' },
              { n: '5', l: 'categorías' },
              { n: '100%', l: 'RAC 100' },
            ].map(({ n, l }) => (
              <div key={l} className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-orange-400">{n}</span>
                <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="bg-[#f8f6f6]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">

          {/* ── Featured article ───────────────────────────────────────────── */}
          {featured && (
            <div className="mb-12">
              <p className="text-xs font-black uppercase tracking-widest text-orange-600 mb-4 flex items-center gap-2">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                Artículo destacado
              </p>
              <Link href={`/blog/${featured.slug}`} className="group block rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
                {/* Gradient cover image */}
                <div className={`relative ${CAT[featured.category]?.heroBg ?? 'bg-gradient-to-br from-slate-800 to-slate-700'} p-8 md:p-12`}>
                  <div className="absolute inset-0 opacity-[0.06]"><svg width="100%" height="100%"><defs><pattern id="feat-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/></pattern></defs><rect width="100%" height="100%" fill="url(#feat-grid)"/></svg></div>
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/15 text-white`}>
                        {featured.category}
                      </span>
                      <ReadingBadge minutes={featured.readingTime} />
                      <span className="text-xs text-white/50">
                        {new Date(featured.publishedAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white leading-tight mb-3 max-w-2xl group-hover:text-orange-300 transition-colors">
                      {featured.title}
                    </h2>
                    <p className="text-white/70 text-sm leading-relaxed max-w-xl">
                      {featured.excerpt}
                    </p>
                  </div>
                </div>
                <div className="bg-white px-8 md:px-12 py-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-600 group-hover:text-orange-700">
                    Leer artículo
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                  </span>
                  <span className="text-xs text-slate-300">Bitafly</span>
                </div>
              </Link>
            </div>
          )}

          {/* ── 2×2 top grid ───────────────────────────────────────────────── */}
          {topGrid.length > 0 && (
            <div className="mb-10">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5">
                Últimos artículos
              </p>
              <div className="grid md:grid-cols-2 gap-5">
                {topGrid.map(post => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-orange-100 hover:shadow-md transition-all duration-200"
                  >
                    {/* Color bar top */}
                    <div className={`h-2 ${CAT[post.category]?.bar ?? 'bg-slate-400'}`} />
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${CAT[post.category]?.pill ?? 'bg-slate-100 text-slate-600'}`}>
                          {post.category}
                        </span>
                        <ReadingBadge minutes={post.readingTime} />
                      </div>
                      <h2 className="text-base font-black uppercase tracking-tight text-navy mb-2 group-hover:text-orange-600 transition-colors leading-snug">
                        {post.title}
                      </h2>
                      <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-4">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-300">
                          {new Date(post.publishedAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-xs font-black uppercase text-orange-500 group-hover:text-orange-600 flex items-center gap-1 transition-colors">
                          Leer
                          <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Remaining posts — compact list ─────────────────────────────── */}
          {bottomList.length > 0 && (
            <div className="mb-12">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5">
                Más artículos
              </p>
              <div className="space-y-3">
                {bottomList.map(post => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group flex items-start gap-4 bg-white rounded-xl px-5 py-4 border border-slate-100 hover:border-orange-100 hover:shadow-sm transition-all duration-200"
                  >
                    {/* Category bar */}
                    <div className={`flex-shrink-0 w-1 self-stretch rounded-full ${CAT[post.category]?.bar ?? 'bg-slate-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${CAT[post.category]?.pill ?? 'bg-slate-100 text-slate-600'}`}>
                          {post.category}
                        </span>
                        <ReadingBadge minutes={post.readingTime} />
                        <span className="text-xs text-slate-300 hidden sm:inline">
                          {new Date(post.publishedAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <h2 className="text-sm font-black uppercase tracking-tight text-navy group-hover:text-orange-600 transition-colors leading-snug">
                        {post.title}
                      </h2>
                    </div>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-orange-500 flex-shrink-0 mt-0.5 transition-colors group-hover:translate-x-0.5 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Newsletter ──────────────────────────────────────────────────── */}
          <div className="mb-8">
            <NewsletterSignup source="blog" />
          </div>

          {/* ── CTA ─────────────────────────────────────────────────────────── */}
          <div className="bg-navy rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.04]"><svg width="100%" height="100%"><defs><pattern id="cta-g" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5"/></pattern></defs><rect width="100%" height="100%" fill="url(#cta-g)"/></svg></div>
            <div className="relative">
              <p className="text-xs font-black uppercase tracking-widest text-orange-400 mb-3">
                Gestiona tu operación
              </p>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-3">
                Todo lo que lees aquí,<br className="hidden md:block"/> automatizado en Bitafly
              </h2>
              <p className="text-slate-300 text-sm mb-6 max-w-lg mx-auto leading-relaxed">
                Bitácora digital, SMS, SORA, autorizaciones AeroCivil y gestión de flota
                en una sola plataforma diseñada para la RAC 100.
              </p>
              <Link
                href="/registro"
                className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-900/30 hover:bg-orange-400 transition-colors"
              >
                Comenzar gratis
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
              </Link>
              <p className="text-slate-500 text-xs mt-3">Sin tarjeta de crédito · Cancelar cuando quieras</p>
            </div>
          </div>

        </div>
      </main>

      <SEOFooter />
    </>
  );
}
