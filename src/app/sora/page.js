import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';
import Decor from '@/components/landing/Decor';
import FeatureSpotlight from '@/components/landing/FeatureSpotlight';
import { SoraScene } from '@/components/landing/Illustrations';
import RelatedReading from '@/components/seo/RelatedReading';

export const metadata = {
  title: 'Análisis SORA para Operadores de Drones en Colombia',
  description: 'Evalúa el riesgo de tus operaciones RPAS con el método SORA (JARUS v2). Calcula GRC, ARC y SAIL automáticamente. Genera el documento para la AeroCivil en minutos.',
  keywords: ['SORA drones Colombia', 'análisis riesgo RPAS', 'JARUS SORA Colombia', 'SAIL operaciones UAS', 'autorización BVLOS Colombia'],
  alternates: { canonical: '/sora' },
  openGraph: {
    title: 'Análisis SORA para Drones en Colombia | Bitafly',
    description: 'Evaluación de riesgo SORA para operaciones RPAS. GRC, ARC y SAIL automáticos. Documento para AeroCivil en minutos.',
    url: 'https://bitafly.com/sora',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: '¿Qué es el análisis SORA para drones?', acceptedAnswer: { '@type': 'Answer', text: 'SORA (Specific Operations Risk Assessment) es la metodología estándar desarrollada por JARUS para evaluar el riesgo de operaciones RPAS. Analiza el riesgo en tierra (GRC) y el riesgo aéreo (ARC) para determinar el nivel de integridad requerido (SAIL). La AeroCivil lo solicita en autorizaciones especiales como BVLOS y vuelos sobre aglomeraciones.' } },
    { '@type': 'Question', name: '¿Cuándo exige la AeroCivil un análisis SORA?', acceptedAnswer: { '@type': 'Answer', text: 'La AeroCivil solicita evidencia de evaluación de riesgo tipo SORA para operaciones fuera de la línea de visión visual (BVLOS), vuelos en zonas controladas, sobre aglomeraciones de personas y operaciones nocturnas. Bitafly guía al operador en cada paso del análisis.' } },
    { '@type': 'Question', name: '¿Qué es el SAIL en el análisis SORA?', acceptedAnswer: { '@type': 'Answer', text: 'El SAIL (Specific Assurance and Integrity Level) es el resultado del análisis SORA. Va del 1 al 6 y determina los OSO (Operational Safety Objectives) que el operador debe cumplir para esa operación. Bitafly lo calcula automáticamente a partir del GRC y ARC mitigados.' } },
    { '@type': 'Question', name: '¿Necesito experiencia en aviación para usar el módulo SORA de Bitafly?', acceptedAnswer: { '@type': 'Answer', text: 'No. Bitafly guía el análisis con preguntas en lenguaje claro, explica cada concepto y sugiere mitigaciones comunes. El documento final se genera automáticamente listo para adjuntar a tu solicitud de autorización en la AeroCivil.' } },
  ],
};

const accent = '#ec5b13';

const SAIL_LEVELS = [
  { sail: 'I–II',  risk: 'Bajo',  color: '#22c55e', desc: 'VLOS, área despoblada, dron < 4 kg' },
  { sail: 'III–IV', risk: 'Medio', color: '#f59e0b', desc: 'VLOS área habitada o BVLOS despoblado' },
  { sail: 'V–VI',  risk: 'Alto',  color: '#ef4444', desc: 'BVLOS sobre áreas habitadas' },
];

const STEPS = [
  { n: '01', label: 'Define el CONOPS',        desc: 'Área, altitud, tipo de vuelo y aeronave' },
  { n: '02', label: 'Calcula el GRC',          desc: 'Riesgo en tierra según densidad poblacional' },
  { n: '03', label: 'Calcula el ARC',          desc: 'Riesgo aéreo según entorno y tráfico' },
  { n: '04', label: 'Aplica mitigaciones',     desc: 'Reduce GRC y ARC con medidas técnicas u operacionales' },
  { n: '05', label: 'Obtén el SAIL',           desc: 'Nivel de integridad requerido para la operación' },
  { n: '06', label: 'Genera el documento',     desc: 'PDF listo para adjuntar a la solicitud AeroCivil' },
];

export default function SoraPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SEONav />

      {/* HERO */}
      <section style={{ padding: '80px 32px 72px', background: '#fff', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
        <Decor variant="hero" />
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ maxWidth: '1100px', margin: '0 auto', gap: '56px', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(236,91,19,0.08)', border: '1px solid rgba(236,91,19,0.2)', borderRadius: '9999px', padding: '5px 14px', marginBottom: '20px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accent }} />
              <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: accent }}>SORA · Evaluación de Riesgo RPAS</span>
            </div>
            <h1 style={{ fontSize: 'clamp(36px,4vw,52px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 1.02, color: '#1A202C', marginBottom: '20px' }}>
              Análisis <span style={{ color: accent }}>SORA</span> para Operaciones de Drones en Colombia
            </h1>
            <p style={{ fontSize: '16px', fontWeight: 500, color: '#64748b', lineHeight: 1.65, maxWidth: '480px', marginBottom: '28px' }}>
              Evalúa el riesgo de tus operaciones RPAS con el método JARUS v2. Calcula GRC, ARC y SAIL automáticamente y genera el documento para la AeroCivil en minutos.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link href="/registro" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: accent, color: '#fff', padding: '14px 28px', borderRadius: '16px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none', boxShadow: '0 8px 24px rgba(236,91,19,0.3)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>radar</span>Comenzar gratis
              </Link>
              <Link href="/autorizaciones-aerocivil" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1.5px solid #e2e8f0', color: '#475569', padding: '14px 28px', borderRadius: '16px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none' }}>
                Ver autorizaciones AeroCivil
              </Link>
            </div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginTop: '14px' }}>Incluido en todos los planes · Compatible con RAC 100</p>
          </div>

          {/* SAIL visual */}
          <div style={{ background: '#1A202C', borderRadius: '20px', padding: '24px' }}>
            <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: accent, marginBottom: '16px' }}>Niveles SAIL — Resultado SORA</div>
            {SAIL_LEVELS.map(s => (
              <div key={s.sail} style={{ background: `${s.color}18`, border: `1px solid ${s.color}40`, borderRadius: '12px', padding: '14px 16px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 900, color: s.color, letterSpacing: '-0.04em' }}>SAIL {s.sail}</span>
                  <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: s.color, background: `${s.color}20`, padding: '3px 8px', borderRadius: '99px' }}>Riesgo {s.risk}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

            {/* SPOTLIGHT */}
      <FeatureSpotlight
        flip
        overline="Evaluación de riesgo"
        title={<>Determina tu nivel <span style={{color:'#ec5b13'}}>SAIL</span> con SORA</>}
        desc="Guía paso a paso de la metodología SORA: riesgo en tierra (GRC), riesgo en aire (ARC) y el nivel de aseguramiento SAIL resultante, documentado y exportable."
        bullets={[
          'Cálculo de GRC y ARC guiado por la metodología',
          'Nivel SAIL resultante con OSO aplicables',
          'Plantillas reutilizables por tipo de operación',
          'Resultado documentado para tu manual y la UAEAC',
        ]}
      >
        <SoraScene />
      </FeatureSpotlight>

      {/* PASOS */}
      <section style={{ background: '#f8f6f6', padding: '72px 32px', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
        <Decor variant="light" />
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: accent, marginBottom: '12px' }}>Proceso</p>
            <h2 style={{ fontSize: 'clamp(28px,3vw,44px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: '#1A202C' }}>Análisis SORA en 6 pasos</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: '20px' }}>
            {STEPS.map(s => (
              <div key={s.n} style={{ background: '#fff', border: '1.5px solid #f1f5f9', borderRadius: '20px', padding: '24px' }}>
                <div style={{ fontSize: '28px', fontWeight: 900, color: accent, letterSpacing: '-0.04em', marginBottom: '8px' }}>{s.n}</div>
                <div style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#1A202C', marginBottom: '6px' }}>{s.label}</div>
                <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: '#fff', padding: '72px 32px', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
        <Decor variant="light" />
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(24px,2.5vw,36px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: '#1A202C', marginBottom: '36px', textAlign: 'center' }}>Preguntas frecuentes sobre SORA</h2>
          {faqSchema.mainEntity.map((q, i) => (
            <div key={i} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '24px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#1A202C', marginBottom: '10px' }}>{q.name}</h3>
              <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.7 }}>{q.acceptedAnswer.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section style={{ background: '#1A202C', padding: '72px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
        <Decor variant="dark" />
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: accent, marginBottom: '16px' }}>Listo para comenzar</p>
          <h2 style={{ fontSize: 'clamp(28px,3vw,40px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: '#fff', marginBottom: '16px' }}>Evalúa tus operaciones con SORA hoy</h2>
          <p style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '28px', lineHeight: 1.6 }}>Sin experiencia en aviación requerida. Bitafly guía cada paso del análisis y genera el documento para la AeroCivil automáticamente.</p>
          <Link href="/registro" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: accent, color: '#fff', padding: '16px 36px', borderRadius: '16px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none', boxShadow: '0 8px 24px rgba(236,91,19,0.4)' }}>
            Comenzar gratis — sin tarjeta
          </Link>
        </div>
      </section>

      <RelatedReading items={[
        { href: '/blog/analisis-sora-operaciones-drones-colombia', title: 'Análisis SORA para operaciones de drones: qué es y cómo se calcula' },
        { href: '/blog/operaciones-bvlos-drones-colombia', title: 'Operaciones BVLOS con drones en Colombia: requisitos' },
      ]} />

      <SEOFooter />
    </>
  );
}
