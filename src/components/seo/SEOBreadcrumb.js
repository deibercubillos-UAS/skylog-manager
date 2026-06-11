import Link from 'next/link';

/**
 * SEOBreadcrumb — visual breadcrumb + inline JSON-LD schema.
 * Colocar justo después de <SEONav /> en cada feature page.
 *
 * Props:
 *   items: Array<{ label: string, href?: string }>
 *   — el primer item siempre es Inicio implícito; el último no lleva href.
 *
 * Ejemplo:
 *   <SEOBreadcrumb items={[{ label: 'Plataforma' }, { label: 'Bitácora Digital RAC 100' }]} />
 */

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com').replace(/\/$/, '');

export default function SEOBreadcrumb({ items = [] }) {
  const allItems = [{ label: 'Inicio', href: '/' }, ...items];

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: allItems.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${SITE_URL}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <nav aria-label="Ubicación en el sitio" style={{ background: '#fff', borderBottom: '1px solid #f1f5f9', padding: '10px 32px' }}>
        <ol
          style={{ listStyle: 'none', padding: 0, margin: '0 auto', maxWidth: '1100px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}
        >
          {allItems.map((item, i) => {
            const isLast = i === allItems.length - 1;
            return (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {i > 0 && (
                  <span aria-hidden="true" style={{ fontSize: '12px', color: '#cbd5e1' }}>›</span>
                )}
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', textDecoration: 'none' }}
                    className="hover:text-primary transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    style={{ fontSize: '12px', fontWeight: isLast ? 700 : 500, color: isLast ? '#1A202C' : '#64748b' }}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
