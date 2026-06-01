import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com';

export const metadata = {
  title: 'Digital Drone Logbook for Colombia (RAC 100 Compliant) | Bitafly',
  description: 'The only drone flight logbook built for Colombia\'s RAC 100 regulation. Automatically generates F-OPS-002 PDF, tracks flight hours and battery cycles. Free 6-month trial.',
  keywords: ['drone logbook colombia', 'UAV logbook colombia', 'RAC 100 flight log', 'digital flight logbook colombia', 'RPAS logbook aerocivil'],
  alternates: { canonical: '/drone-logbook-colombia' },
  openGraph: {
    title: 'Digital Drone Logbook for Colombia — RAC 100 Compliant | Bitafly',
    description: 'Automated F-OPS-002 generation, flight hour tracking and battery cycle management for UAS operators in Colombia.',
    url: `${SITE_URL}/drone-logbook-colombia`,
    type: 'website',
    locale: 'en_US',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'What is RAC 100 in Colombia?', acceptedAnswer: { '@type': 'Answer', text: 'RAC 100 (Colombian Aeronautical Regulation Part 100) is the regulatory framework issued by the UAEAC (AeroCivil) that governs all commercial drone operations in Colombia. It requires operators to maintain a digital flight logbook (format F-OPS-002), document maintenance, implement a Safety Management System (SMS), and obtain flight authorizations.' } },
    { '@type': 'Question', name: 'What is the F-OPS-002 format?', acceptedAnswer: { '@type': 'Answer', text: 'The F-OPS-002 is the official AeroCivil flight log format required for each commercial drone operation in Colombia. It must include flight date, takeoff and landing times, aircraft registration, pilot CPR number, mission type, battery status, and the chief pilot\'s signature. Bitafly generates this PDF automatically.' } },
    { '@type': 'Question', name: 'Can I use Bitafly if my team speaks English?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Bitafly\'s interface is primarily in Spanish (Colombian) since it\'s designed for the Colombian regulatory framework. However, international operators working in Colombia can use it without difficulty — the forms are straightforward and the generated PDFs comply with AeroCivil requirements regardless of the user\'s native language.' } },
    { '@type': 'Question', name: 'Does Bitafly support DJI flight log import?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Bitafly imports .TXT files from DJI RC and RC 2 controllers automatically via USB. Flight data — duration, maximum altitude, battery telemetry — pre-fills the logbook without manual entry.' } },
  ],
};

const accent = '#ec5b13';

const FEATURES = [
  { icon: 'menu_book',         title: 'F-OPS-002 Auto-generation', desc: 'Every flight generates the official AeroCivil PDF with your aircraft registration, pilot CPR, mission type and all required fields.' },
  { icon: 'timer',             title: 'Automatic Hour Tracking',   desc: 'Flight hours accumulate automatically per aircraft. Maintenance alerts trigger at 200 hours or 6 months — whichever comes first.' },
  { icon: 'battery_charging_full', title: 'Battery Cycle Control', desc: 'Track charge cycles per battery serial number. Configurable retirement threshold. F-MNT-003 PDF for AeroCivil audits.' },
  { icon: 'flight_takeoff',    title: 'DJI Log Import',            desc: 'Connect your DJI RC via USB. Bitafly reads .TXT flight logs and pre-fills the logbook automatically.' },
  { icon: 'group',             title: 'Multi-Pilot Management',    desc: 'Assign flights to specific pilots. Track individual flight hours and CPR certificate expiration dates.' },
  { icon: 'cloud_done',        title: '100% Cloud-Based',          desc: 'No installation. Works from any browser — smartphone, tablet or laptop. Daily automatic backups.' },
];

export default function DroneLogbookColombiaPage() {
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
              <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: accent }}>Colombia · RAC 100 Compliant</span>
            </div>
            <h1 style={{ fontSize: 'clamp(36px,4vw,52px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 1.02, color: '#1A202C', marginBottom: '20px' }}>
              Digital Drone Logbook for <span style={{ color: accent }}>Colombia</span>
            </h1>
            <p style={{ fontSize: '16px', fontWeight: 500, color: '#64748b', lineHeight: 1.65, maxWidth: '480px', marginBottom: '28px' }}>
              The only drone flight management platform built specifically for Colombia's <strong>RAC 100</strong> regulation.
              Automatically generates the F-OPS-002 PDF required by AeroCivil for every commercial flight.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link href="/registro" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: accent, color: '#fff', padding: '14px 28px', borderRadius: '16px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none', boxShadow: '0 8px 24px rgba(236,91,19,0.3)' }}>
                Start free — 6 months
              </Link>
              <Link href="/rac-100-compliance" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1.5px solid #e2e8f0', color: '#475569', padding: '14px 28px', borderRadius: '16px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none' }}>
                RAC 100 Overview
              </Link>
            </div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginTop: '14px' }}>No credit card required · All plans include unlimited flight logs</p>
          </div>

          {/* Log sample visual */}
          <div style={{ background: '#1A202C', borderRadius: '20px', padding: '24px' }}>
            <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: accent, marginBottom: '16px' }}>F-OPS-002 — Flight Log Sample</div>
            {[
              { label: 'Aircraft Registration', val: 'HK-R0042-RPAS' },
              { label: 'Pilot (CPR)',            val: 'C. Mendoza · CPR-2025-0042' },
              { label: 'Mission Type',           val: 'Infrastructure Inspection' },
              { label: 'Takeoff / Landing',      val: '09:14 → 09:47 (33 min)' },
              { label: 'Total Hours (Hobbs)',    val: '412.5 h' },
              { label: 'Battery Start / End',    val: '94% → 38%' },
              { label: 'Visual Condition',       val: 'VMC' },
              { label: 'Incidents',              val: 'None' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '9px', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '9px' }}>
                <span style={{ color: '#64748b' }}>{r.label}</span>
                <span style={{ color: '#fff', fontWeight: 700, textAlign: 'right', maxWidth: '55%' }}>{r.val}</span>
              </div>
            ))}
            <div style={{ marginTop: '12px', background: accent, color: '#fff', padding: '8px 14px', borderRadius: '10px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.08em' }}>
              Export F-OPS-002 PDF →
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ background: '#f8f6f6', padding: '72px 32px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: accent, marginBottom: '12px' }}>Everything you need</p>
            <h2 style={{ fontSize: 'clamp(28px,3vw,44px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: '#1A202C' }}>Built for RAC 100 compliance</h2>
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
          <h2 style={{ fontSize: 'clamp(24px,2.5vw,36px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: '#1A202C', marginBottom: '36px', textAlign: 'center' }}>Frequently asked questions</h2>
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
          <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: accent, marginBottom: '16px' }}>Free 6-month trial</p>
          <h2 style={{ fontSize: 'clamp(28px,3vw,40px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: '#fff', marginBottom: '16px' }}>Start logging your Colombian operations today</h2>
          <p style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '28px', lineHeight: 1.6 }}>
            RAC 100 logbook, maintenance tracking, SMS and AeroCivil authorizations. No credit card. No commitment.
          </p>
          <Link href="/registro" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: accent, color: '#fff', padding: '16px 36px', borderRadius: '16px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none', boxShadow: '0 8px 24px rgba(236,91,19,0.4)' }}>
            Create free account
          </Link>
        </div>
      </section>

      <SEOFooter />
    </>
  );
}
