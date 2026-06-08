import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';

export const metadata = {
  title: 'Planificación de Vuelos de Drones y KML para AeroCivil',
  description: 'Planea operaciones RPAS en Colombia: define el área en un mapa interactivo, genera el archivo KML para la AeroCivil y gestiona tus autorizaciones de vuelo. Cumplimiento RAC 100.',
  keywords: ['planificación vuelos drones Colombia', 'KML AeroCivil drones', 'plan de vuelo RPAS Colombia', 'mapa operación drones', 'área operación KML'],
  alternates: { canonical: '/plan-vuelo-drones' },
  openGraph: {
    title: 'Planificación de Vuelo de Drones y KML AeroCivil | Bitafly Colombia',
    description: 'Dibuja el área de operación en un mapa, genera el KML para la AeroCivil y gestiona autorizaciones. Diseñado para operadores RPAS en Colombia.',
    url: 'https://bitafly.com/plan-vuelo-drones',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: '¿Para qué sirve el archivo KML en la AeroCivil?', acceptedAnswer: { '@type': 'Answer', text: 'El archivo KML (Keyhole Markup Language) define el área geográfica de la operación en formato estándar de Google Earth. La AeroCivil lo exige en las solicitudes de autorización de vuelo para zonas controladas, áreas restringidas y operaciones especiales. Bitafly te permite dibujarlo directamente en un mapa y exportarlo en un clic.' } },
    { '@type': 'Question', name: '¿Qué tipos de área puedo definir en Bitafly?', acceptedAnswer: { '@type': 'Answer', text: 'Bitafly soporta tres geometrías para el área de operación: polígono libre (para áreas irregulares), corredor lineal (para operaciones de infraestructura) y círculo con radio configurable (para operaciones puntuales). Cada tipo genera el KML correcto para la AeroCivil.' } },
    { '@type': 'Question', name: '¿Puedo planear el vuelo desde el celular en campo?', acceptedAnswer: { '@type': 'Answer', text: 'Sí. El mapa interactivo de Bitafly funciona desde cualquier celular con navegador moderno. Puedes usar tu ubicación actual como punto de referencia para dibujar el área de operación sobre el terreno real.' } },
    { '@type': 'Question', name: '¿El archivo KML de Bitafly es compatible con el portal de la AeroCivil?', acceptedAnswer: { '@type': 'Answer', text: 'Sí. Bitafly genera archivos KML estándar en WGS-84, compatibles con el portal de autorizaciones de la AeroCivil y con Google Earth. También puedes exportar el área como KMZ (archivo comprimido) para una presentación más limpia.' } },
  ],
};

const accent = '#ec5b13';

const FEATURES = [
  { icon: 'map',            title: 'Mapa interactivo',        desc: 'Dibuja el área de operación directamente sobre el mapa. Cambia entre satélite y mapa según necesites.' },
  { icon: 'add_location_alt', title: 'Polígono, línea y círculo', desc: 'Tres geometrías para cualquier tipo de operación. El área se cierra automáticamente al completar el polígono.' },
  { icon: 'download',       title: 'Exportar KML y KMZ',      desc: 'Descarga el archivo en el formato que necesites. Compatible con el portal AeroCivil y Google Earth.' },
  { icon: 'explore',        title: 'Coordenadas precisas',    desc: 'Visualiza latitud y longitud de cada punto. Cumple los requisitos de precisión de la AeroCivil.' },
  { icon: 'event_available','title': 'Vinculado a autorizaciones', desc: 'El área de operación se adjunta directamente a tu solicitud de autorización dentro de Bitafly.' },
  { icon: 'travel_explore', title: 'Cálculo de área y perímetro', desc: 'Bitafly calcula automáticamente el área en m²/ha y el perímetro en km del área definida.' },
];

export default function PlanVueloDronesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SEONav />

      {/* HERO */}
      <section style={{ padding: '80px 32px 72px', background: '#fff' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '56px', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(236,91,19,0.08)', border: '1px solid rgba(236,91,19,0.2)', borderRadius: '9999px', padding: '5px 14px', marginBottom: '20px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accent }} />
              <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: accent }}>Planificación · KML · AeroCivil</span>
            </div>
            <h1 style={{ fontSize: 'clamp(36px,4vw,52px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 1.02, color: '#1A202C', marginBottom: '20px' }}>
              Planea tu Vuelo y Genera el <span style={{ color: accent }}>KML para la AeroCivil</span>
            </h1>
            <p style={{ fontSize: '16px', fontWeight: 500, color: '#64748b', lineHeight: 1.65, maxWidth: '480px', marginBottom: '28px' }}>
              Dibuja el área de operación en un mapa interactivo, genera el archivo KML o KMZ compatible con la AeroCivil y adjúntalo a tu solicitud de autorización en segundos.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link href="/registro" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: accent, color: '#fff', padding: '14px 28px', borderRadius: '16px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none', boxShadow: '0 8px 24px rgba(236,91,19,0.3)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>map</span>Comenzar gratis
              </Link>
              <Link href="/autorizaciones-aerocivil" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1.5px solid #e2e8f0', color: '#475569', padding: '14px 28px', borderRadius: '16px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none' }}>
                Ver autorizaciones AeroCivil
              </Link>
            </div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginTop: '14px' }}>KML compatible con AeroCivil y Google Earth · Funciona en móvil</p>
          </div>

          {/* Map visual mockup */}
          <div style={{ background: '#1A202C', borderRadius: '20px', padding: '24px' }}>
            <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: accent, marginBottom: '16px' }}>Área de Operación — Vista previa KML</div>
            <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px', fontFamily: 'monospace' }}>
              {[
                { label: 'Tipo',        val: 'Polígono', color: '#a78bfa' },
                { label: 'Puntos',      val: '6 vértices', color: '#38bdf8' },
                { label: 'Área',        val: '2.34 ha', color: accent },
                { label: 'Perímetro',   val: '618 m', color: accent },
                { label: 'Altitud',     val: '120 m AGL', color: '#22c55e' },
                { label: 'Formato',     val: 'WGS-84', color: '#94a3b8' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '11px' }}>
                  <span style={{ color: '#64748b' }}>{r.label}</span>
                  <span style={{ color: r.color, fontWeight: 700 }}>{r.val}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #1e293b', marginTop: '12px', paddingTop: '12px', display: 'flex', gap: '8px' }}>
                <div style={{ background: accent, color: '#fff', padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Descargar KML</div>
                <div style={{ border: '1px solid #334155', color: '#94a3b8', padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: 700 }}>Descargar KMZ</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ background: '#f8f6f6', padding: '72px 32px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: accent, marginBottom: '12px' }}>Planificación de vuelo</p>
            <h2 style={{ fontSize: 'clamp(28px,3vw,44px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: '#1A202C' }}>Todo lo que necesitas para planear y documentar</h2>
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
          <h2 style={{ fontSize: 'clamp(24px,2.5vw,36px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: '#1A202C', marginBottom: '36px', textAlign: 'center' }}>Preguntas sobre el plan de vuelo</h2>
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
          <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: accent, marginBottom: '16px' }}>KML en un clic</p>
          <h2 style={{ fontSize: 'clamp(28px,3vw,40px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: '#fff', marginBottom: '16px' }}>Deja de hacer el KML a mano</h2>
          <p style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '28px', lineHeight: 1.6 }}>Dibuja el área en el mapa, exporta el KML para la AeroCivil y vincula el plan a tu solicitud de autorización. Todo en minutos.</p>
          <Link href="/registro" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: accent, color: '#fff', padding: '16px 36px', borderRadius: '16px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none', boxShadow: '0 8px 24px rgba(236,91,19,0.4)' }}>
            Comenzar gratis — sin tarjeta
          </Link>
        </div>
      </section>

      <SEOFooter />
    </>
  );
}
