import { notFound } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';
import BlogReadingProgress from '@/components/blog/BlogReadingProgress';
import { BLOG_POSTS, getPostBySlug, getAllSlugs } from '@/lib/blogPosts';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com').replace(/\/$/, '');

export function generateStaticParams() {
  return getAllSlugs();
}

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

// ── Category visual styles ─────────────────────────────────────────────────
const CATEGORY_STYLE = {
  'Normativa':    {
    heroBg: 'bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800',
    badge:  'bg-blue-700/70 text-blue-100',
    accent: 'text-blue-300',
    border: 'border-blue-700/50',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    ),
  },
  'Operaciones':  {
    heroBg: 'bg-gradient-to-br from-slate-950 via-slate-900 to-orange-900',
    badge:  'bg-orange-600/70 text-orange-100',
    accent: 'text-orange-300',
    border: 'border-orange-700/50',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
    ),
  },
  'Trámites':     {
    heroBg: 'bg-gradient-to-br from-purple-950 via-purple-900 to-purple-800',
    badge:  'bg-purple-700/70 text-purple-100',
    accent: 'text-purple-300',
    border: 'border-purple-700/50',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
    ),
  },
  'Seguridad':    {
    heroBg: 'bg-gradient-to-br from-red-950 via-red-900 to-red-800',
    badge:  'bg-red-700/70 text-red-100',
    accent: 'text-red-300',
    border: 'border-red-700/50',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
    ),
  },
  'Herramientas': {
    heroBg: 'bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800',
    badge:  'bg-emerald-700/70 text-emerald-100',
    accent: 'text-emerald-300',
    border: 'border-emerald-700/50',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    ),
  },
};

// ── Inject IDs into H2 headings (server-side, for TOC anchors) ─────────────
function addHeadingIds(html) {
  let counter = 0;
  return html.replace(/<h2([^>]*)>/gi, (match, attrs) => {
    if (attrs.includes('id=')) return match;
    counter++;
    return `<h2${attrs} id="section-${counter}">`;
  });
}

// ── Extract TOC from H2 headings ───────────────────────────────────────────
function extractTOC(html) {
  const items = [];
  let counter = 0;
  const re = /<h2[^>]*>(.*?)<\/h2>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    counter++;
    const text = m[1].replace(/<[^>]+>/g, '').trim();
    if (text) items.push({ id: `section-${counter}`, text });
  }
  return items;
}

// ── Share icon SVGs ────────────────────────────────────────────────────────
function ShareButtons({ title, url }) {
  const encoded = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-black uppercase tracking-widest text-slate-400 mr-1">Compartir</span>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`}
        target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#0077B5]/10 text-[#0077B5] hover:bg-[#0077B5]/20 transition-colors"
        aria-label="Compartir en LinkedIn"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        LinkedIn
      </a>
      <a
        href={`https://twitter.com/intent/tweet?url=${encoded}&text=${encodedTitle}`}
        target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        aria-label="Compartir en X (Twitter)"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        X
      </a>
      <a
        href={`https://wa.me/?text=${encodedTitle}%20${encoded}`}
        target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 transition-colors"
        aria-label="Compartir en WhatsApp"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        WhatsApp
      </a>
    </div>
  );
}

export default function BlogPost({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  const style = CATEGORY_STYLE[post.category] ?? CATEGORY_STYLE['Normativa'];
  const processedHtml = addHeadingIds(post.body);
  const toc = extractTOC(post.body);

  // Related posts: same category first, then other categories, max 3
  const related = BLOG_POSTS
    .filter(p => p.slug !== post.slug)
    .sort((a, b) => (b.category === post.category ? 1 : 0) - (a.category === post.category ? 1 : 0))
    .slice(0, 3);

  const postUrl = `${SITE_URL}/blog/${post.slug}`;

  const articleSchema = {
    '@context':    'https://schema.org',
    '@type':       'Article',
    headline:      post.title,
    description:   post.metaDescription,
    datePublished: post.publishedAt,
    dateModified:  post.updatedAt ?? post.publishedAt,
    author: { '@type': 'Organization', name: 'Bitafly', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Bitafly',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
    keywords: post.keywords.join(', '),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog',   item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: postUrl },
    ],
  };

  const RELATED_CATEGORY_COLOR = {
    'Normativa':    'bg-blue-50 text-blue-700',
    'Operaciones':  'bg-orange-50 text-orange-700',
    'Trámites':     'bg-purple-50 text-purple-700',
    'Seguridad':    'bg-red-50 text-red-700',
    'Herramientas': 'bg-green-50 text-green-700',
  };

  return (
    <>
      <SEONav />
      <BlogReadingProgress />

      <Script id="schema-article" type="application/ld+json" strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <Script id="schema-breadcrumb" type="application/ld+json" strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* ── Hero cover ─────────────────────────────────────────────────── */}
      <header className={`relative ${style.heroBg} overflow-hidden`}>
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.06]" aria-hidden="true">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="blog-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.6"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#blog-grid)"/>
          </svg>
        </div>
        {/* Gradient blur blob */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" aria-hidden="true"/>

        <div className="relative max-w-5xl mx-auto px-6 pt-10 pb-14 md:pt-14 md:pb-20">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-white/50 mb-7" aria-label="Ruta de navegación">
            <Link href="/" className="hover:text-white/80 transition-colors">Inicio</Link>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            <Link href="/blog" className="hover:text-white/80 transition-colors">Blog</Link>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            <span className="text-white/60 truncate max-w-xs">{post.category}</span>
          </nav>

          {/* Meta chips */}
          <div className="flex flex-wrap items-center gap-2.5 mb-5">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full backdrop-blur-sm ${style.badge}`}>
              {style.icon}
              {post.category}
            </span>
            <span className={`text-xs font-medium ${style.accent}`}>
              {new Date(post.publishedAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span className={`text-xs ${style.accent} flex items-center gap-1`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {post.readingTime} min de lectura
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-[2.6rem] font-black uppercase tracking-tight text-white leading-tight mb-6 max-w-4xl" style={{ lineHeight: 1.18 }}>
            {post.title}
          </h1>

          {/* Excerpt */}
          <p className={`text-white/75 text-base md:text-lg leading-relaxed max-w-2xl border-l-[3px] ${style.border} pl-5`}>
            {post.excerpt}
          </p>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="bg-[#f8f6f6] min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_272px] gap-8 items-start">

            {/* Left: article */}
            <div className="min-w-0">

              {/* Article body */}
              <article
                className="blog-article bg-white rounded-2xl px-7 py-8 md:px-10 md:py-10 shadow-sm border border-slate-100"
                dangerouslySetInnerHTML={{ __html: processedHtml }}
              />

              {/* Share + author */}
              <div className="mt-6 bg-white rounded-2xl px-7 py-6 md:px-10 shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <ShareButtons title={post.title} url={postUrl} />
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-700">Equipo Bitafly</p>
                    <p className="text-xs text-slate-400">Especialistas en normativa UAS Colombia</p>
                  </div>
                </div>
              </div>

              {/* CTA block */}
              <div className="mt-6 bg-navy text-white rounded-2xl p-8 md:p-10 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.04]" aria-hidden="true">
                  <svg width="100%" height="100%"><defs><pattern id="cta-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5"/></pattern></defs><rect width="100%" height="100%" fill="url(#cta-grid)"/></svg>
                </div>
                <div className="relative">
                  <p className="text-xs font-black uppercase tracking-widest text-orange-400 mb-2">Bitafly</p>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight mb-3">
                    Aplica todo esto desde hoy
                  </h2>
                  <p className="text-slate-300 text-sm mb-6 leading-relaxed max-w-sm mx-auto">
                    Bitácora RAC 100, SMS, SORA, autorizaciones AeroCivil y gestión de flota.
                    Plan gratuito sin tarjeta de crédito.
                  </p>
                  <Link
                    href="/registro"
                    className="inline-flex items-center gap-2 bg-orange-500 text-white px-7 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-colors shadow-lg shadow-orange-900/30"
                  >
                    Comenzar gratis
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                  </Link>
                </div>
              </div>

              {/* Related posts */}
              {related.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 px-1">
                    Artículos relacionados
                  </p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {related.map(r => (
                      <Link
                        key={r.slug}
                        href={`/blog/${r.slug}`}
                        className="group bg-white border border-slate-100 rounded-2xl overflow-hidden hover:border-orange-200 hover:shadow-sm transition-all"
                      >
                        <div className={`h-1.5 ${CATEGORY_STYLE[r.category]?.heroBg ?? 'bg-slate-400'}`} />
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${RELATED_CATEGORY_COLOR[r.category] ?? 'bg-slate-100 text-slate-600'}`}>
                              {r.category}
                            </span>
                            <span className="text-xs text-slate-400">{r.readingTime} min</span>
                          </div>
                          <h3 className="text-sm font-black uppercase tracking-tight text-navy group-hover:text-orange-600 transition-colors leading-snug line-clamp-3">
                            {r.title}
                          </h3>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Back */}
              <div className="mt-8 pt-5 border-t border-slate-200">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-orange-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12"/></svg>
                  Todos los artículos
                </Link>
              </div>
            </div>

            {/* Right: sticky TOC sidebar */}
            {toc.length > 2 && (
              <aside className="hidden lg:block">
                <div className="sticky top-24 space-y-4">
                  {/* TOC */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10"/></svg>
                      En este artículo
                    </p>
                    <nav className="space-y-0.5">
                      {toc.map((item, i) => (
                        <a
                          key={item.id}
                          href={`#${item.id}`}
                          className="toc-link"
                        >
                          <span className="toc-num">{String(i + 1).padStart(2, '0')}</span>
                          {item.text}
                        </a>
                      ))}
                    </nav>
                  </div>

                  {/* Sidebar meta */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-xs text-slate-500 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      <span>Publicado {new Date(post.publishedAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                    {post.updatedAt && post.updatedAt !== post.publishedAt && (
                      <div className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                        <span>Actualizado {new Date(post.updatedAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      <span>{post.readingTime} min de lectura</span>
                    </div>
                  </div>

                  {/* Sidebar CTA */}
                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 text-center">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-orange-600 mb-1">Bitafly</p>
                    <p className="text-sm font-bold text-navy mb-3 leading-snug">Gestiona tu operación RAC 100</p>
                    <Link
                      href="/registro"
                      className="block w-full text-center bg-orange-500 text-white text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-xl hover:bg-orange-600 transition-colors"
                    >
                      Empezar gratis
                    </Link>
                    <p className="text-xs text-slate-400 mt-2">Sin tarjeta de crédito</p>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      </main>

      <SEOFooter />
    </>
  );
}
