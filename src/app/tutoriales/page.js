import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';
import VideoCard from '@/components/tutorials/VideoCard';
import { getTutorialBloques, getPublishedTutorialVideos } from '@/lib/tutorialVideos';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com').replace(/\/$/, '');
const CHANNEL_URL = 'https://www.youtube.com/@Bitafly';

export const metadata = {
  title: 'Tutoriales en Video | Bitafly — Aprende a Usar la Plataforma',
  description: 'Videotutoriales de Bitafly: cómo crear tu cuenta, recorrer el panel, elegir tu plan y usar cada módulo de la plataforma para operadores UAS en Colombia (RAC 100).',
  alternates: { canonical: '/tutoriales' },
  openGraph: {
    title: 'Tutoriales en Video — Bitafly',
    description: 'Aprende a usar Bitafly paso a paso con nuestra serie de videos: registro, panel, planes y cada módulo de la plataforma.',
    url: `${SITE_URL}/tutoriales`,
    type: 'website',
  },
};

function isoDurationToMinSec(iso) {
  const m = iso?.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  const min = parseInt(m[1] || '0', 10);
  const sec = parseInt(m[2] || '0', 10);
  return `${min}:${String(sec).padStart(2, '0')}`;
}

function buildSchemas(bloques, published) {
  const allVideos = bloques.flatMap((b) => b.videos);
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${SITE_URL}/tutoriales#webpage`,
      name: 'Tutoriales en Video — Bitafly',
      description: metadata.description,
      url: `${SITE_URL}/tutoriales`,
      inLanguage: 'es-CO',
      isPartOf: { '@id': `${SITE_URL}/#website` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Serie de tutoriales Bitafly',
      url: `${SITE_URL}/tutoriales`,
      numberOfItems: allVideos.length,
      itemListElement: allVideos.map((v, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: v.title,
        url: v.youtubeId ? `https://www.youtube.com/watch?v=${v.youtubeId}` : `${SITE_URL}/tutoriales`,
      })),
    },
    ...published.map((v) => ({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: v.title,
      description: v.description,
      thumbnailUrl: [`https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`],
      uploadDate: v.publishedAt,
      duration: v.duration,
      embedUrl: `https://www.youtube-nocookie.com/embed/${v.youtubeId}`,
      contentUrl: `https://www.youtube.com/watch?v=${v.youtubeId}`,
      publisher: {
        '@type': 'Organization',
        name: 'BitaFly',
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
      },
    })),
  ];
}

export default function TutorialesPage() {
  const bloques = getTutorialBloques();
  const published = getPublishedTutorialVideos();
  const schemas = buildSchemas(bloques, published);

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <SEONav />

      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}

      {/* ── HERO ── */}
      <section className="bg-navy text-white py-12 md:py-24 px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4 md:space-y-6">
          <p className="inline-flex items-center gap-2 bg-white/10 text-orange-400 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs font-black uppercase tracking-widest">
            <span className="material-symbols-outlined text-sm">play_circle</span>
            Serie de Video Tutoriales
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black uppercase tracking-tighter leading-[0.95]">
            Aprende a usar <span className="text-primary">Bitafly</span>
          </h1>
          <p className="text-slate-300 text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
            Videos cortos, en español, grabados con vuelos y equipos reales — desde crear
            tu cuenta hasta dominar cada módulo de la plataforma.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {bloques.map((b) => (
              <a
                key={b.num}
                href={`#bloque-${b.num}`}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-xs font-black uppercase tracking-wide text-slate-300 hover:text-white transition-all"
              >
                {b.title}
              </a>
            ))}
            <a
              href={CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/90 hover:bg-primary rounded-full text-xs font-black uppercase tracking-wide text-white transition-all"
            >
              <span className="material-symbols-outlined text-sm">subscriptions</span>
              Suscríbete en YouTube
            </a>
          </div>
        </div>
      </section>

      {/* ── CONTENIDO ── */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-20 space-y-14 md:space-y-20">
        {bloques.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <span className="material-symbols-outlined text-4xl text-slate-300">movie</span>
            <p className="text-slate-500 text-sm">Estamos preparando la serie de tutoriales. Vuelve pronto.</p>
          </div>
        )}

        {bloques.map((bloque, idx) => (
          <section key={bloque.num} id={`bloque-${bloque.num}`} className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <div className="size-11 md:size-14 rounded-2xl bg-navy flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-lg md:text-2xl">{bloque.icon}</span>
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Bloque {bloque.num}</p>
                <h2 className="text-lg md:text-2xl font-black uppercase tracking-tighter text-navy leading-tight">
                  {bloque.title}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {bloque.videos.map((v) => (
                <article key={v.id} className="space-y-3">
                  <VideoCard video={v} />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {v.youtubeId && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {isoDurationToMinSec(v.duration)}
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-navy text-sm leading-snug">{v.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{v.description}</p>
                  </div>
                </article>
              ))}
            </div>

            {idx < bloques.length - 1 && <div className="mt-14 md:mt-20 border-t border-slate-100" />}
          </section>
        ))}

        {/* CTA final */}
        <section className="bg-navy rounded-2xl md:rounded-[2.5rem] p-7 md:p-12 text-white text-center space-y-5">
          <span className="material-symbols-outlined text-primary text-4xl md:text-5xl">rocket_launch</span>
          <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter">
            ¿Listo para probar Bitafly?
          </h2>
          <p className="text-slate-300 text-sm max-w-lg mx-auto leading-relaxed">
            Crea tu cuenta gratuita y sigue los videos paso a paso con tu propia operación.
            Sin tarjeta de crédito.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/registro" className="bg-primary text-white px-7 py-3.5 md:px-8 md:py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 transition-all shadow-xl shadow-orange-500/20 active:scale-95">
              Crear cuenta gratis
            </Link>
            <Link href="/documentacion" className="border-2 border-white/20 px-7 py-3.5 md:px-8 md:py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/5 transition-all active:scale-95">
              Ver documentación escrita
            </Link>
          </div>
        </section>
      </div>

      <SEOFooter brandDesc="Software de gestión aeronáutica para operadores UAS en Colombia. Cumplimiento RAC 100 desde el primer vuelo." />
    </div>
  );
}
