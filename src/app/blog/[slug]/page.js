import { notFound } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';
import { BLOG_POSTS, getPostBySlug, getAllSlugs } from '@/lib/blogPosts';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com';

// ── SSG: pre-renderiza todas las rutas en build time ─────────────────────────
export function generateStaticParams() {
  return getAllSlugs();
}

// ── Metadata dinámica por post ─────────────────────────────────────────────
export function generateMetadata({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post) return {};
  return {
    title:       post.metaTitle,
    description: post.metaDescription,
    keywords:    post.keywords,
    alternates:  { canonical: `/blog/${post.slug}` },
    openGraph: {
      title:       post.metaTitle,
      description: post.metaDescription,
      url:         `${SITE_URL}/blog/${post.slug}`,
      type:        'article',
      publishedTime: post.publishedAt,
      modifiedTime:  post.updatedAt,
    },
  };
}

const CATEGORY_COLOR = {
  'Normativa':    { bg: 'bg-blue-50',   text: 'text-blue-700'   },
  'Operaciones':  { bg: 'bg-orange-50', text: 'text-orange-700' },
  'Trámites':     { bg: 'bg-purple-50', text: 'text-purple-700' },
  'Seguridad':    { bg: 'bg-red-50',    text: 'text-red-700'    },
  'Herramientas': { bg: 'bg-green-50',  text: 'text-green-700'  },
};

export default function BlogPost({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  // Posts relacionados (misma categoría, excluyendo el actual)
  const related = BLOG_POSTS
    .filter(p => p.slug !== post.slug && p.category === post.category)
    .slice(0, 2);

  const articleSchema = {
    '@context':         'https://schema.org',
    '@type':            'Article',
    headline:           post.title,
    description:        post.metaDescription,
    datePublished:      post.publishedAt,
    dateModified:       post.updatedAt ?? post.publishedAt,
    author: {
      '@type': 'Organization',
      name:    'Bitafly',
      url:     SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name:    'Bitafly',
      url:     SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url:     `${SITE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id':   `${SITE_URL}/blog/${post.slug}`,
    },
    keywords: post.keywords.join(', '),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog',   item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE_URL}/blog/${post.slug}` },
    ],
  };

  return (
    <>
      <SEONav />

      <Script
        id="schema-article"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <Script
        id="schema-breadcrumb"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <main className="max-w-3xl mx-auto px-6 py-12">

        {/* ── Breadcrumb ─────────────────────────────────────────────── */}
        <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-8">
          <Link href="/" className="hover:text-orange-600 transition-colors">Inicio</Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <Link href="/blog" className="hover:text-orange-600 transition-colors">Blog</Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-slate-600 truncate">{post.category}</span>
        </nav>

        {/* ── Header del artículo ────────────────────────────────────── */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${CATEGORY_COLOR[post.category]?.bg ?? 'bg-slate-100'} ${CATEGORY_COLOR[post.category]?.text ?? 'text-slate-600'}`}>
              {post.category}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {new Date(post.publishedAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span className="text-xs text-slate-400">· {post.readingTime} min de lectura</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-navy leading-tight mb-5">
            {post.title}
          </h1>

          <p className="text-slate-500 text-base leading-relaxed border-l-4 border-orange-400 pl-4">
            {post.excerpt}
          </p>
        </header>

        {/* ── Contenido ─────────────────────────────────────────────── */}
        <article
          className="prose prose-slate prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-h2:text-xl prose-h3:text-base prose-a:text-orange-600 prose-a:no-underline hover:prose-a:underline prose-li:text-slate-600 prose-p:text-slate-600 prose-p:leading-relaxed max-w-none"
          dangerouslySetInnerHTML={{ __html: post.body }}
        />

        {/* ── CTA dentro del artículo ────────────────────────────────── */}
        <div className="mt-12 bg-navy text-white rounded-3xl p-8 text-center">
          <p className="text-xs font-black uppercase tracking-widest text-orange-400 mb-2">Bitafly</p>
          <h2 className="text-xl font-black uppercase tracking-tight mb-3">
            Aplica todo esto desde hoy
          </h2>
          <p className="text-slate-300 text-sm mb-5 leading-relaxed">
            Bitácora RAC 100, SMS, SORA, autorizaciones AeroCivil y gestión de flota.
            Plan gratuito sin tarjeta de crédito.
          </p>
          <Link
            href="/registro"
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-colors"
          >
            Comenzar gratis
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>

        {/* ── Artículos relacionados ─────────────────────────────────── */}
        {related.length > 0 && (
          <div className="mt-12">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5">
              Artículos relacionados
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {related.map(r => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="group border border-slate-100 rounded-2xl p-5 hover:border-orange-200 hover:shadow-sm transition-all bg-white"
                >
                  <p className="text-xs font-black uppercase text-slate-400 mb-2">{r.readingTime} min</p>
                  <h3 className="text-sm font-black uppercase tracking-tight text-navy group-hover:text-orange-600 transition-colors leading-snug">
                    {r.title}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Volver al blog ─────────────────────────────────────────── */}
        <div className="mt-10 pt-6 border-t border-slate-100">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-orange-600 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Todos los artículos
          </Link>
        </div>
      </main>

      <SEOFooter />
    </>
  );
}
