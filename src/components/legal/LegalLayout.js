import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';
import { LEGAL_PAGES } from '@/lib/legalPages';

const proseClasses = [
  '[&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-[#1A202C] [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:scroll-mt-28 [&_h2]:first:mt-0',
  '[&_h3]:text-base [&_h3]:font-extrabold [&_h3]:text-[#1A202C] [&_h3]:mt-7 [&_h3]:mb-2 [&_h3]:scroll-mt-28',
  '[&_p]:text-[15px] [&_p]:text-slate-600 [&_p]:leading-[1.75] [&_p]:mb-4',
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-1.5 [&_ul]:text-[15px] [&_ul]:text-slate-600',
  '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_ol]:space-y-1.5 [&_ol]:text-[15px] [&_ol]:text-slate-600',
  '[&_li]:leading-[1.7]',
  '[&_li>strong]:text-[#1A202C]',
  '[&_strong]:text-[#1A202C] [&_strong]:font-bold',
  '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-primary/40 hover:[&_a]:decoration-primary',
  '[&_table]:w-full [&_table]:text-sm [&_table]:mb-5 [&_table]:border-collapse',
  '[&_th]:text-left [&_th]:font-black [&_th]:text-[#1A202C] [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-[11px] [&_th]:py-2.5 [&_th]:pr-4 [&_th]:border-b-2 [&_th]:border-slate-200',
  '[&_td]:py-2.5 [&_td]:pr-4 [&_td]:border-b [&_td]:border-slate-100 [&_td]:text-slate-600 [&_td]:align-top [&_td]:text-[14px]',
  '[&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:my-5 [&_blockquote]:text-slate-500 [&_blockquote]:text-sm [&_blockquote]:italic',
].join(' ');

export default function LegalLayout({ eyebrow = 'Legal', title, description, updated, toc = [], children }) {
  return (
    <>
      <SEONav />
      <main className="bg-white">
        <section className="bg-[#1A202C] text-white px-6 pt-32 pb-14 md:pt-40 md:pb-16">
          <div className="max-w-[1100px] mx-auto">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-4">{eyebrow}</p>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-[1.05] mb-4 max-w-3xl">
              {title}
            </h1>
            {description && (
              <p className="text-slate-300 text-base leading-relaxed max-w-2xl mb-3">{description}</p>
            )}
            {updated && <p className="text-xs text-slate-500">Última actualización: {updated}</p>}
          </div>
        </section>

        <section className="px-6 py-14 md:py-20">
          <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-[220px_1fr] gap-12">
            {toc.length > 0 && (
              <nav aria-label="Contenido del documento" className="hidden md:block">
                <div className="sticky top-28">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                    Contenido
                  </p>
                  <ul className="space-y-2 text-[13px] border-l border-slate-200 pl-4">
                    {toc.map((item) => (
                      <li key={item.id}>
                        <a href={`#${item.id}`} className="text-slate-500 hover:text-primary transition-colors">
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </nav>
            )}
            <article className={`max-w-[720px] ${proseClasses}`}>{children}</article>
          </div>
        </section>

        <section className="border-t border-slate-100 bg-slate-50 px-6 py-10">
          <div className="max-w-[1100px] mx-auto">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
              Otros documentos legales
            </p>
            <div className="flex flex-wrap gap-3">
              {LEGAL_PAGES.map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  className="text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-full px-4 py-2 hover:border-primary hover:text-primary transition-colors"
                >
                  {p.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SEOFooter />
    </>
  );
}
