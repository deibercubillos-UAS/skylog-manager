import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';
import NewsletterSignup from '@/components/NewsletterSignup';
import { BLOG_POSTS } from '@/lib/blogPosts';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com').replace(/\/$/, '');

// CollectionPage + ItemList — Google entiende que /blog es una colección de artículos
function buildBlogSchemas(posts) {
  const sorted = [...posts].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${SITE_URL}/blog#webpage`,
      'name': 'Blog Bitafly — Recursos para Operadores de Drones en Colombia',
      'description': 'Guías, normativa y recursos para operadores RPAS en Colombia. RAC 100, trámites AeroCivil, SMS aeronáutico y gestión de flotas.',
      'url': `${SITE_URL}/blog`,
      'inLanguage': 'es-CO',
      'isPartOf': { '@id': `${SITE_URL}/#website` },
      'breadcrumb': {
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Inicio', 'item': SITE_URL },
          { '@type': 'ListItem', 'position': 2, 'name': 'Blog',   'item': `${SITE_URL}/blog` },
        ],
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      'name': 'Artículos del Blog de Bitafly',
      'url': `${SITE_URL}/blog`,
      'numberOfItems': sorted.length,
      'itemListElement': sorted.map((post, i) => ({
        '@type': 'ListItem',
        'position': i + 1,
        'url': `${SITE_URL}/blog/${post.slug}`,
        'name': post.title,
      })),
    },
  ];
}

export const metadata = {
  title: 'Blog sobre Drones en Colombia: RAC 100, Normativa y Operaciones',
  metaTitle: 'Blog Drones Colombia — RAC 100, Normativa, Operaciones UAS | Bitafly',
  description: 'Guías, normativa y recursos para operadores de drones en Colombia. RAC 100, registro UAEAC, SMS aeronáutico, SORA y más. Publicado por el equipo de Bitafly.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog Bitafly | Todo sobre drones en Colombia',
    description: 'Recursos para operadores RPAS en Colombia: normativa RAC 100, trámites AeroCivil, seguridad operacional y gestión de flotas.',
    url: `${SITE_URL}/blog`,
    type: 'website',
  },
};

const CATEGORY_COLOR = {
  'Normativa':    { bg: 'bg-blue-50',   text: 'text-blue-700'   },
  'Operaciones':  { bg: 'bg-orange-50', text: 'text-orange-700' },
  'Trámites':     { bg: 'bg-purple-50', text: 'text-purple-700' },
  'Seguridad':    { bg: 'bg-red-50',    text: 'text-red-700'    },
  'Herramientas': { bg: 'bg-green-50',  text: 'text-green-700'  },
};

export default function BlogIndex() {
  const posts = [...BLOG_POSTS].sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
  );
  const [featured, ...rest] = posts;
  const schemas = buildBlogSchemas(posts);

  return (
    <>
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}
      <SEONav />

      <main>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="bg-navy text-white py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <span className="inline-block text-xs font-black uppercase tracking-widest text-orange-400 mb-4">
              Blog Bitafly
            </span>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight leading-tight mb-4">
              Drones en Colombia:<br />
              <span className="text-orange-400">normativa, operaciones</span> y recursos
            </h1>
            <p className="text-slate-300 text-base max-w-xl leading-relaxed">
              Guías prácticas para operadores RPAS en Colombia. RAC 100, trámites AeroCivil,
              seguridad operacional y gestión de flotas — sin tecnicismos innecesarios.
            </p>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-6 py-14">

          {/* ── Artículo destacado ──────────────────────────────────────── */}
          {featured && (
            <div className="mb-14">
              <p className="text-xs font-black uppercase tracking-widest text-orange-600 mb-4">
                Artículo destacado
              </p>
              <Link href={`/blog/${featured.slug}`} className="group block bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all">
                <div className="p-8 md:p-10">
                  <div className="flex items-center gap-3 mb-5">
                    <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${CATEGORY_COLOR[featured.category]?.bg ?? 'bg-slate-100'} ${CATEGORY_COLOR[featured.category]?.text ?? 'text-slate-600'}`}>
                      {featured.category}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {new Date(featured.publishedAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    <span className="text-xs text-slate-400">· {featured.readingTime} min de lectura</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-navy mb-4 group-hover:text-orange-600 transition-colors leading-tight">
                    {featured.title}
                  </h2>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6 max-w-2xl">
                    {featured.excerpt}
                  </p>
                  <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-600">
                    Leer artículo
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </span>
                </div>
              </Link>
            </div>
          )}

          {/* ── Grid de artículos ──────────────────────────────────────── */}
          {rest.length > 0 && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">
                Más artículos
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                {rest.map(post => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-md hover:border-orange-100 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${CATEGORY_COLOR[post.category]?.bg ?? 'bg-slate-100'} ${CATEGORY_COLOR[post.category]?.text ?? 'text-slate-600'}`}>
                        {post.category}
                      </span>
                      <span className="text-xs text-slate-400">{post.readingTime} min</span>
                    </div>
                    <h2 className="text-base font-black uppercase tracking-tight text-navy mb-2 group-hover:text-orange-600 transition-colors leading-snug">
                      {post.title}
                    </h2>
                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
                      {post.excerpt}
                    </p>
                    <p className="text-xs text-slate-300 mt-3">
                      {new Date(post.publishedAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Captura de leads (newsletter) ──────────────────────────── */}
          <div className="mt-16">
            <NewsletterSignup source="blog" />
          </div>

          {/* ── CTA ───────────────────────────────────────────────────── */}
          <div className="mt-8 bg-orange-50 border border-orange-100 rounded-3xl p-8 md:p-10 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-orange-600 mb-3">
              Gestiona tu operación
            </p>
            <h2 className="text-2xl font-black uppercase tracking-tight text-navy mb-3">
              Todo lo que lees aquí, automatizado en Bitafly
            </h2>
            <p className="text-slate-500 text-sm mb-6 max-w-lg mx-auto">
              Bitácora digital, SMS, SORA, autorizaciones AeroCivil y gestión de flota
              en una sola plataforma diseñada para la RAC 100.
            </p>
            <Link
              href="/registro"
              className="inline-flex items-center gap-2 bg-orange-600 text-white px-7 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-200 hover:bg-orange-700 transition-colors"
            >
              Comenzar gratis
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        </div>
      </main>

      <SEOFooter />
    </>
  );
}
