import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com').replace(/\/$/, '');

export const metadata = {
  title: 'Bitafly vs AirData UAV: Comparativa para Operadores en Colombia | Bitafly',
  description: 'Compara Bitafly y AirData UAV para operadores de drones en Colombia. RAC 100, idioma español, bitácora digital, precios en pesos y soporte local. ¿Cuál cumple la normativa colombiana?',
  keywords: ['bitafly vs airdata', 'alternativa airdata colombia', 'airdata uav colombia', 'software drones colombia comparativa', 'mejor plataforma drones colombia'],
  alternates: { canonical: '/comparativa-bitafly-airdata' },
  openGraph: {
    title: 'Bitafly vs AirData UAV — Comparativa para Colombia | Bitafly',
    description: 'AirData es el líder global. Bitafly es la opción diseñada para la RAC 100 colombiana. Compara ambas plataformas punto a punto.',
    url: `${SITE_URL}/comparativa-bitafly-airdata`,
    type: 'website',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: '¿AirData UAV funciona con la RAC 100 colombiana?', acceptedAnswer: { '@type': 'Answer', text: 'No. AirData UAV fue diseñado para el mercado anglosajón y no genera los formatos oficiales exigidos por la AeroCivil colombiana (F-OPS-002, F-MNT-003, F-HUM-005, F-OPS-001). Tampoco gestiona el CPR colombiano ni los roles definidos en la RAC 100.' } },
    { '@type': 'Question', name: '¿Bitafly puede importar logs de DJI como AirData?', acceptedAnswer: { '@type': 'Answer', text: 'Sí. Bitafly importa archivos .TXT de los controladores DJI RC y RC 2 automáticamente. Los datos del vuelo (duración, altitud máxima, telemetría de batería) se pre-llenan en la bitácora sin digitar nada manualmente.' } },
    { '@type': 'Question', name: '¿Es posible usar AirData y Bitafly al mismo tiempo?', acceptedAnswer: { '@type': 'Answer', text: 'Sí. Algunos operadores usan AirData para análisis de telemetría y Bitafly para el cumplimiento regulatorio colombiano (bitácora oficial, mantenimiento, SMS y autorizaciones AeroCivil). Son plataformas complementarias.' } },
    { '@type': 'Question', name: '¿Bitafly es más barato que AirData UAV?', acceptedAnswer: { '@type': 'Answer', text: 'Bitafly tiene un plan gratuito de 6 meses sin tarjeta. Los planes pagos inician en $15 USD/mes. AirData Pro cuesta $11,99 USD/mes pero sin soporte para la normativa colombiana. Para cumplimiento RAC 100, Bitafly es la única opción funcional independientemente del precio.' } },
  ],
};

const accent = '#ec5b13';

const ROWS = [
  { feature: 'Idioma de la plataforma',         bitafly: '✅ Español colombiano',         airdata: '❌ Inglés (sin ES local)' },
  { feature: 'Bitácora F-OPS-002',              bitafly: '✅ Generación automática PDF',   airdata: '❌ No existe' },
  { feature: 'Formato F-MNT-003 baterías',      bitafly: '✅ Generación automática PDF',   airdata: '❌ No existe' },
  { feature: 'Formato F-HUM-005 pilotos',       bitafly: '✅ Generación automática PDF',   airdata: '❌ No existe' },
  { feature: 'Autorización F-OPS-001 AeroCivil',bitafly: '✅ Con KML del área',            airdata: '❌ No existe' },
  { feature: 'Importar logs DJI RC',            bitafly: '✅ Automático vía USB',          airdata: '✅ Automático' },
  { feature: 'SMS aeronáutico',                 bitafly: '✅ Incidentes, acciones, PDF',   airdata: '❌ No existe' },
  { feature: 'Análisis SORA',                   bitafly: '✅ GRC/ARC/SAIL asistido',       airdata: '❌ No existe' },
  { feature: 'Roles RAC 100 (Jefe Pilotos, etc)',bitafly:'✅ 5 roles específicos RAC 100', airdata: '❌ No contempla' },
  { feature: 'CPR con alertas de vencimiento',  bitafly: '✅ 30 y 7 días antes',           airdata: '❌ No existe' },
  { feature: 'Pago en pesos colombianos (PSE)', bitafly: '✅ Wompi — PSE y tarjetas CO',   airdata: '❌ Solo USD/tarjeta int.' },
  { feature: 'Soporte en español Colombia',     bitafly: '✅ WhatsApp + email UTC-5',       airdata: '❌ Email en inglés' },
  { feature: 'Análisis avanzado telemetría',    bitafly: '🔄 En desarrollo',               airdata: '✅ Líder global' },
  { feature: 'Plan gratuito',                   bitafly: '✅ 6 meses sin tarjeta',          airdata: '✅ Limitado' },
  { feature: 'Precio base',                     bitafly: '$15 USD/mes',                    airdata: '$11,99 USD/mes' },
];

export default function ComparativaPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SEONav />

      {/* HERO */}
      <section style={{ background: '#fff', padding: '72px 32px 60px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(236,91,19,0.08)', border: '1px solid rgba(236,91,19,0.2)', borderRadius: '9999px', padding: '5px 14px', marginBottom: '20px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accent }} />
            <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: accent }}>Comparativa · Colombia 2025</span>
          </div>
          <h1 style={{ fontSize: 'clamp(32px,4vw,52px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 1.02, color: '#1A202C', marginBottom: '20px' }}>
            Bitafly vs <span style={{ color: '#64748b' }}>AirData UAV</span>:<br />
            <span style={{ color: accent }}>¿cuál elegir para Colombia?</span>
          </h1>
          <p style={{ fontSize: '17px', color: '#64748b', lineHeight: 1.65, maxWidth: '600px', margin: '0 auto 32px' }}>
            AirData es el líder global en gestión de drones. Bitafly es la única plataforma diseñada específicamente para la <strong>RAC 100 colombiana</strong>. Compara ambas antes de decidir.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/registro" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: accent, color: '#fff', padding: '14px 28px', borderRadius: '16px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none', boxShadow: '0 8px 24px rgba(236,91,19,0.3)' }}>
              Probar Bitafly gratis
            </Link>
            <Link href="/precios" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1.5px solid #e2e8f0', color: '#475569', padding: '14px 28px', borderRadius: '16px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none' }}>
              Ver precios
            </Link>
          </div>
        </div>
      </section>

      {/* TABLA COMPARATIVA */}
      <section style={{ background: '#f8f6f6', padding: '64px 32px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: accent, marginBottom: '8px', textAlign: 'center' }}>Comparativa punto a punto</p>
          <h2 style={{ fontSize: 'clamp(24px,2.5vw,36px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: '#1A202C', marginBottom: '32px', textAlign: 'center' }}>15 criterios clave</h2>

          <div style={{ background: '#fff', borderRadius: '20px', overflow: 'hidden', border: '1.5px solid #f1f5f9' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', background: '#1A202C', padding: '14px 20px' }}>
              <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#64748b' }}>Característica</span>
              <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: accent, textAlign: 'center' }}>Bitafly</span>
              <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#64748b', textAlign: 'center' }}>AirData UAV</span>
            </div>
            {/* Rows */}
            {ROWS.map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '13px 20px', borderBottom: i < ROWS.length - 1 ? '1px solid #f1f5f9' : 'none', background: i % 2 === 0 ? '#fff' : '#fafafa', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1A202C' }}>{r.feature}</span>
                <span style={{ fontSize: '12px', color: r.bitafly.startsWith('✅') ? '#16a34a' : r.bitafly.startsWith('❌') ? '#dc2626' : '#64748b', fontWeight: 700, textAlign: 'center' }}>{r.bitafly}</span>
                <span style={{ fontSize: '12px', color: r.airdata.startsWith('✅') ? '#16a34a' : r.airdata.startsWith('❌') ? '#dc2626' : '#64748b', fontWeight: 700, textAlign: 'center' }}>{r.airdata}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VEREDICTO */}
      <section style={{ background: '#fff', padding: '64px 32px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ background: 'rgba(236,91,19,0.05)', border: '1.5px solid rgba(236,91,19,0.2)', borderRadius: '20px', padding: '28px' }}>
            <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: accent, marginBottom: '12px' }}>Elige Bitafly si…</p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                'Operas comercialmente en Colombia bajo la RAC 100',
                'Necesitas el F-OPS-002, F-MNT-003 y F-OPS-001 en PDF',
                'Debes gestionar CPR, SMS aeronáutico y roles normativos',
                'Quieres soporte en español colombiano y pago en COP',
                'Estás en proceso de certificación ESUAS ante la AeroCivil',
              ].map((t, i) => (
                <li key={i} style={{ fontSize: '13px', color: '#475569', fontWeight: 500, paddingLeft: '20px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: accent, fontWeight: 900 }}>→</span> {t}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ background: '#f8f6f6', border: '1.5px solid #f1f5f9', borderRadius: '20px', padding: '28px' }}>
            <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#64748b', marginBottom: '12px' }}>Elige AirData si…</p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                'Tu operación es internacional (EE.UU., Europa, Oceanía)',
                'Necesitas análisis avanzado de telemetría de vuelo',
                'No tienes obligación de cumplir la RAC 100 colombiana',
                'Tu equipo trabaja cómodamente en inglés técnico',
                'Usas drones exóticos con logs no estándar',
              ].map((t, i) => (
                <li key={i} style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, paddingLeft: '20px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: '#94a3b8', fontWeight: 900 }}>→</span> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#94a3b8', marginTop: '24px', maxWidth: '600px', margin: '24px auto 0' }}>
          💡 Muchos operadores colombianos usan <strong>ambas plataformas</strong>: AirData para análisis de telemetría y Bitafly para el cumplimiento regulatorio.
        </p>
      </section>

      {/* FAQ */}
      <section style={{ background: '#f8f6f6', padding: '64px 32px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px,2.5vw,32px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: '#1A202C', marginBottom: '32px', textAlign: 'center' }}>Preguntas frecuentes</h2>
          {faqSchema.mainEntity.map((q, i) => (
            <div key={i} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#1A202C', marginBottom: '8px' }}>{q.name}</h3>
              <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.7 }}>{q.acceptedAnswer.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ background: '#1A202C', padding: '72px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: '580px', margin: '0 auto' }}>
          <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: accent, marginBottom: '16px' }}>Sin tarjeta de crédito</p>
          <h2 style={{ fontSize: 'clamp(26px,3vw,40px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: '#fff', marginBottom: '16px' }}>
            Prueba Bitafly 6 meses gratis
          </h2>
          <p style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '28px', lineHeight: 1.6 }}>
            Bitácora RAC 100, mantenimiento, SMS y autorizaciones AeroCivil. Diseñado para Colombia. Sin contratos.
          </p>
          <Link href="/registro" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: accent, color: '#fff', padding: '16px 36px', borderRadius: '16px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none', boxShadow: '0 8px 24px rgba(236,91,19,0.4)' }}>
            Comenzar gratis ahora
          </Link>
          <p style={{ fontSize: '11px', color: '#475569', marginTop: '14px' }}>¿Ya tienes cuenta? <Link href="/login" style={{ color: accent, textDecoration: 'none', fontWeight: 700 }}>Ingresar →</Link></p>
        </div>
      </section>

      <SEOFooter />
    </>
  );
}
