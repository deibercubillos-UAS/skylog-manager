/**
 * SocialProofStrip — mini testimonios para feature landing pages.
 * Mostrar antes del CTA final de cualquier página de funcionalidad.
 * Props: heading (string) — opcional, personaliza el título
 */
export default function SocialProofStrip({ heading = 'Operadores UAS que ya confían en Bitafly' }) {
  const testimonials = [
    {
      quote: 'Pasamos la auditoría de AeroCivil sin contratiempos. Los reportes PDF son exactamente lo que piden los inspectores.',
      name: 'Carlos M.',
      role: 'Gerente de Operaciones · Bogotá',
      initial: 'C',
    },
    {
      quote: 'Antes llevábamos todo en Excel. Ahora el sistema nos alerta automáticamente cuando una batería llega al límite de ciclos.',
      name: 'Andrés R.',
      role: 'Jefe de Pilotos · Medellín',
      initial: 'A',
    },
    {
      quote: 'Configuración en menos de 10 minutos y el soporte en español es excelente. La mejor decisión como operador UAS.',
      name: 'Laura V.',
      role: 'Administradora · Cali',
      initial: 'L',
    },
  ];

  return (
    <section
      style={{ background: '#f8f6f6', padding: '64px 32px' }}
      aria-labelledby="social-proof-heading"
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            {[...Array(5)].map((_, i) => (
              <span key={i} style={{ color: '#ec5b13', fontSize: '18px' }}>★</span>
            ))}
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginLeft: '4px' }}>4.9 / 5</span>
          </div>
          <h2
            id="social-proof-heading"
            style={{ fontSize: 'clamp(20px,2.5vw,30px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.03em', color: '#1A202C' }}
          >
            {heading}
          </h2>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '16px' }}>
          {testimonials.map((t) => (
            <figure
              key={t.name}
              style={{ background: '#fff', border: '1.5px solid #f1f5f9', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div style={{ display: 'flex', gap: '3px' }}>
                {[...Array(5)].map((_, i) => (
                  <span key={i} style={{ color: '#ec5b13', fontSize: '14px' }}>★</span>
                ))}
              </div>
              <blockquote style={{ fontSize: '13px', color: '#475569', lineHeight: 1.65, flex: 1, margin: 0 }}>
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#ec5b13', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  aria-hidden="true"
                >
                  <span style={{ color: '#fff', fontWeight: 900, fontSize: '13px' }}>{t.initial}</span>
                </div>
                <div>
                  <p style={{ fontWeight: 900, fontSize: '13px', color: '#1A202C' }}>{t.name}</p>
                  <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>{t.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
