import Link from 'next/link';

// Enlaza landing pages hacia artículos de blog específicos que hoy no reciben
// ningún link interno fuera de /blog y el sitemap — Search Console confirmó
// que Google los descubre pero no los indexa (ver auditoría 2026-08-01). No
// cambia contenido de negocio, solo agrega señal de enlazado interno real.
export default function RelatedReading({ heading = 'Sigue leyendo', items }) {
  if (!items?.length) return null;

  return (
    <section style={{ padding: '56px 24px', background: '#f8fafc' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <h2 style={{
          fontSize: '13px', fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '0.06em', color: '#64748b', marginBottom: '20px',
        }}>
          {heading}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          {items.map(item => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'block', padding: '18px 20px', background: '#fff',
                border: '1.5px solid #e2e8f0', borderRadius: '14px',
                textDecoration: 'none', color: '#1A202C', fontSize: '14px',
                fontWeight: 700, lineHeight: 1.4,
              }}
            >
              {item.title}
              <span style={{ display: 'block', marginTop: '6px', fontSize: '12px', fontWeight: 600, color: '#ec5b13' }}>
                Leer más →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
