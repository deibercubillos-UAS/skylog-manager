import Script from 'next/script';
import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';

export const metadata = {
  title: 'Gestión de Pilotos de Drones y Certificaciones CPR Colombia | Bitafly',
  description: 'Gestiona tu tripulación UAS: certificados CPR, vencimientos, historial de vuelo por piloto y asignación a misiones. Cumplimiento RAC 100 para operadores de drones en Colombia.',
  keywords: ['gestión pilotos drones Colombia', 'CPR piloto remoto', 'certificación piloto UAS', 'tripulación RPAS RAC 100', 'piloto remoto Colombia'],
  alternates: { canonical: '/gestion-pilotos' },
  openGraph: {
    title: 'Gestión de Pilotos UAS y Certificaciones CPR | Bitafly Colombia',
    description: 'Control de certificaciones CPR, horas de vuelo por piloto y asignación a misiones. Todo el cumplimiento RAC 100 para tu tripulación.',
    url: 'https://bitafly.com/gestion-pilotos',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: '¿Qué es el CPR (Certificado de Piloto Remoto)?', acceptedAnswer: { '@type': 'Answer', text: 'El CPR es el Certificado de Piloto Remoto emitido por una Organización de Entrenamiento Aprobada (OEA) en Colombia, según la RAC 100. Acredita que el piloto está capacitado para operar sistemas RPAS en la categoría correspondiente. Tiene fecha de vencimiento y debe renovarse periódicamente.' } },
    { '@type': 'Question', name: '¿Qué información de pilotos gestiona Bitafly?', acceptedAnswer: { '@type': 'Answer', text: 'Bitafly almacena por piloto: datos personales, número de CPR, fecha de emisión y vencimiento, horas de vuelo acumuladas, historial de misiones y documentos de certificación. Envía alertas automáticas antes del vencimiento del CPR.' } },
    { '@type': 'Question', name: '¿Puedo tener múltiples pilotos en una organización?', acceptedAnswer: { '@type': 'Answer', text: 'Sí. Bitafly soporta equipos multi-piloto con roles diferenciados: Jefe de Pilotos, Piloto y Observador. Cada uno tiene su perfil, historial de vuelos y documentación de certificación independiente.' } },
    { '@type': 'Question', name: '¿Cómo funciona la alerta de vencimiento de CPR?', acceptedAnswer: { '@type': 'Answer', text: 'Bitafly envía notificaciones automáticas al administrador y al piloto cuando el CPR está próximo a vencer (30 y 7 días antes). El sistema bloquea la asignación de ese piloto a nuevas misiones si su certificado está vencido.' } },
  ],
};

const accent = '#ec5b13';

const FEATURES = [
  { icon: 'badge',         title: 'Certificados CPR',        desc: 'Almacena número, fecha de emisión y vencimiento de cada piloto. Alertas automáticas 30 y 7 días antes del vencimiento.' },
  { icon: 'timer',         title: 'Horas de vuelo',           desc: 'Contador acumulado por piloto, actualizado automáticamente con cada vuelo registrado en la bitácora.' },
  { icon: 'person_check',  title: 'Roles diferenciados',      desc: 'Jefe de Pilotos, Piloto Remoto y Observador. Cada rol tiene permisos y vistas específicas según la RAC 100.' },
  { icon: 'assignment_ind','title': 'Historial de misiones',  desc: 'Registro completo de todos los vuelos en que participó cada piloto, con fecha, aeronave y resultado.' },
  { icon: 'folder_shared', title: 'Documentos digitales',     desc: 'Adjunta CPR, antecedentes médicos y certificados adicionales. Siempre disponibles para auditoría.' },
  { icon: 'group_add',     title: 'Invitaciones por email',   desc: 'Agrega pilotos a tu organización enviando una invitación. Ellos crean su perfil y se vinculan automáticamente.' },
];

export default function GestionPilotosPage() {
  return (
    <>
      <Script id="faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SEONav />

      {/* HERO */}
      <section style={{ padding: '80px 32px 72px', background: '#fff' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '56px', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(236,91,19,0.08)', border: '1px solid rgba(236,91,19,0.2)', borderRadius: '9999px', padding: '5px 14px', marginBottom: '20px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accent }} />
              <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: accent }}>Tripulación · Certificaciones RAC 100</span>
            </div>
            <h1 style={{ fontSize: 'clamp(36px,4vw,52px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 1.02, color: '#1A202C', marginBottom: '20px' }}>
              Gestión de <span style={{ color: accent }}>Pilotos UAS</span> y Certificaciones CPR
            </h1>
            <p style={{ fontSize: '16px', fontWeight: 500, color: '#64748b', lineHeight: 1.65, maxWidth: '480px', marginBottom: '28px' }}>
              Controla certificados CPR, horas de vuelo acumuladas, historial de misiones y documentación de toda tu tripulación. Alertas automáticas antes de cada vencimiento.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link href="/registro" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: accent, color: '#fff', padding: '14px 28px', borderRadius: '16px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none', boxShadow: '0 8px 24px rgba(236,91,19,0.3)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>group_add</span>Comenzar gratis
              </Link>
              <Link href="/bitacora-digital" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1.5px solid #e2e8f0', color: '#475569', padding: '14px 28px', borderRadius: '16px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none' }}>
                Ver bitácora digital
              </Link>
            </div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginTop: '14px' }}>Pilotos ilimitados en todos los planes · Sin configuración técnica</p>
          </div>

          {/* Pilot card visual */}
          <div style={{ background: '#1A202C', borderRadius: '20px', padding: '24px' }}>
            <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: accent, marginBottom: '16px' }}>Tripulación — Estado actual</div>
            {[
              { name: 'Carlos Mendoza', role: 'Jefe de Pilotos', cpr: 'CPR-2025-0042', horas: '412 h', status: 'Vigente', color: '#22c55e' },
              { name: 'Daniela Ríos',   role: 'Piloto Remoto',   cpr: 'CPR-2024-0187', horas: '218 h', status: 'Vence en 18 días', color: '#f59e0b' },
              { name: 'Felipe Torres',  role: 'Observador',       cpr: 'CPR-2025-0093', horas: '87 h',  status: 'Vigente', color: '#22c55e' },
            ].map(p => (
              <div key={p.name} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{p.name}</div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{p.role} · {p.cpr}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: accent }}>{p.horas}</div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: p.color, marginTop: '2px' }}>{p.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ background: '#f8f6f6', padding: '72px 32px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: accent, marginBottom: '12px' }}>Módulo de Tripulación</p>
            <h2 style={{ fontSize: 'clamp(28px,3vw,44px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: '#1A202C' }}>Todo sobre tu equipo en un solo lugar</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '20px' }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ background: '#fff', border: '1.5px solid #f1f5f9', borderRadius: '24px', padding: '28px' }}>
                <div style={{ width: '48px', height: '48px', background: 'rgba(236,91,19,0.08)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, marginBottom: '16px' }}>
                  <span className="material-symbols-outlined">{f.icon}</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#1A202C', marginBottom: '8px' }}>{f.title}</div>
                <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: '#fff', padding: '72px 32px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(24px,2.5vw,36px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: '#1A202C', marginBottom: '36px', textAlign: 'center' }}>Preguntas sobre gestión de pilotos</h2>
          {faqSchema.mainEntity.map((q, i) => (
            <div key={i} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '24px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#1A202C', marginBottom: '10px' }}>{q.name}</h3>
              <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.7 }}>{q.acceptedAnswer.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#1A202C', padding: '72px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: accent, marginBottom: '16px' }}>Sin papeleo</p>
          <h2 style={{ fontSize: 'clamp(28px,3vw,40px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: '#fff', marginBottom: '16px' }}>Tu tripulación, siempre al día</h2>
          <p style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '28px', lineHeight: 1.6 }}>Bitafly gestiona certificaciones, horas de vuelo y documentación de tu equipo. Sin hojas de cálculo ni carpetas de Drive.</p>
          <Link href="/registro" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: accent, color: '#fff', padding: '16px 36px', borderRadius: '16px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none', boxShadow: '0 8px 24px rgba(236,91,19,0.4)' }}>
            Comenzar gratis — sin tarjeta
          </Link>
        </div>
      </section>

      <SEOFooter />
    </>
  );
}
