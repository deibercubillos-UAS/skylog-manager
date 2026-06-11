import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';
import Decor from '@/components/landing/Decor';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com').replace(/\/$/, '');

export const metadata = {
  title: 'RAC 100 Compliance for Drone Operators in Colombia',
  description: 'Complete guide to RAC 100 compliance for commercial drone operators in Colombia. Requirements, official AeroCivil formats, certifications and how Bitafly automates compliance.',
  keywords: ['RAC 100 compliance colombia', 'drone regulations colombia', 'aerocivil drone requirements', 'RPAS colombia compliance', 'UAS regulations colombia', 'drone certification colombia'],
  alternates: { canonical: '/rac-100-compliance' },
  openGraph: {
    title: 'RAC 100 Compliance Guide for Drone Operators in Colombia | Bitafly',
    description: 'Everything you need to know about RAC 100 — Colombia\'s UAS regulation. Requirements, formats, certifications and compliance software.',
    url: `${SITE_URL}/rac-100-compliance`,
    type: 'article',
    locale: 'en_US',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'Who must comply with RAC 100 in Colombia?', acceptedAnswer: { '@type': 'Answer', text: 'All entities conducting commercial RPAS operations in Colombian airspace must comply with RAC 100. This includes companies and independent operators providing services with drones — aerial photography, inspection, mapping, agriculture, surveillance. Recreational flights of drones under 250g have simplified requirements.' } },
    { '@type': 'Question', name: 'What is the ESUAS certification in Colombia?', acceptedAnswer: { '@type': 'Answer', text: 'ESUAS (Explotador de Sistema de Aeronave No Tripulada) is the operator certification issued by UAEAC (AeroCivil) that authorizes commercial UAS operations in Colombia. It requires demonstrating a Safety Management System (SMS), certified remote pilots (CPR), documented maintenance procedures, and liability insurance.' } },
    { '@type': 'Question', name: 'What records does AeroCivil require?', acceptedAnswer: { '@type': 'Answer', text: 'RAC 100 requires operators to keep: a Flight Master Log (one per flight), a Battery Maintenance Record, a Pilot Flight Hours Record, and a Flight Authorization Request for special operations. AeroCivil does not impose format codes — each operator defines its own document-control nomenclature in its operations manual. Bitafly generates all four in PDF with the codes you choose (F-OPS-002, F-MNT-003, F-HUM-005, F-OPS-001 by default).' } },
    { '@type': 'Question', name: 'Are F-OPS-002, F-MNT-003 official AeroCivil format codes?', acceptedAnswer: { '@type': 'Answer', text: 'No. RAC 100 does not define official format codes. Each company creates its own document-control nomenclature in its operations manual. Bitafly ships these codes as defaults and lets every organization customize them to match its manuals.' } },
    { '@type': 'Question', name: 'What is the CPR (Remote Pilot Certificate) in Colombia?', acceptedAnswer: { '@type': 'Answer', text: 'The CPR (Certificado de Piloto Remoto) is the pilot certification issued by an Approved Training Organization (OEA) in Colombia under RAC 100. It certifies that the pilot is trained to operate RPAS in the corresponding category. It has an expiration date and must be renewed periodically.' } },
  ],
};

const accent = '#ec5b13';

const REQUIREMENTS = [
  { title: 'ESUAS Certification',        desc: 'Operator certification from UAEAC authorizing commercial UAS operations. Requires SMS, certified pilots, maintenance procedures and liability insurance.' },
  { title: 'Aircraft Registration',       desc: 'All RPAS over 250g must be registered with UAEAC\'s SIRAC portal before any commercial operation.' },
  { title: 'Remote Pilot Certificate',    desc: 'Each pilot must hold a valid CPR (Certificado de Piloto Remoto) issued by an AeroCivil-approved training organization.' },
  { title: 'Flight Logbook (F-OPS-002)', desc: 'Every commercial flight must be logged with all fields required by RAC 100 — aircraft, pilot, mission, battery status and flight hours — under your own format code (F-OPS-002 by default).' },
  { title: 'Battery Records (F-MNT-003)','desc': 'Each battery must be tracked by serial number with cycle counts and maintenance interventions, under the format code your manual defines (F-MNT-003 by default).' },
  { title: 'Safety Mgmt. System (SMS)',  desc: 'Operators with 3+ aircraft or complex operations must implement a formal SMS with hazard reporting, incident classification and corrective actions.' },
  { title: 'Liability Insurance',         desc: 'Third-party liability insurance is mandatory. Minimum coverage depends on the aircraft\'s maximum takeoff weight.' },
  { title: 'Flight Authorization',        desc: 'Operations in controlled airspace, restricted areas, or special conditions (BVLOS, night, over crowds) require prior authorization via F-OPS-001.' },
];

export default function Rac100CompliancePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SEONav />

      {/* HERO */}
      <section style={{ background: '#1A202C', padding: '80px 32px 72px', color: '#fff', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
        <Decor variant="dark" />
        <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(236,91,19,0.15)', border: '1px solid rgba(236,91,19,0.3)', borderRadius: '9999px', padding: '5px 14px', marginBottom: '20px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accent }} />
            <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: accent }}>Colombia · UAEAC · AeroCivil</span>
          </div>
          <h1 style={{ fontSize: 'clamp(36px,4vw,56px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 1.02, marginBottom: '20px' }}>
            RAC 100 Compliance<br /><span style={{ color: accent }}>for Drone Operators</span><br />in Colombia
          </h1>
          <p style={{ fontSize: '17px', color: '#94a3b8', lineHeight: 1.65, maxWidth: '600px', margin: '0 auto 32px' }}>
            Colombia's RAC 100 is the regulatory framework governing all commercial drone operations.
            Here's everything you need to know — and how Bitafly automates compliance.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/registro" style={{ background: accent, color: '#fff', padding: '14px 28px', borderRadius: '16px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none' }}>
              Start free compliance tool
            </Link>
            <Link href="/drone-logbook-colombia" style={{ border: '1.5px solid #334155', color: '#94a3b8', padding: '14px 28px', borderRadius: '16px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none' }}>
              Digital logbook →
            </Link>
          </div>
        </div>
      </section>

      {/* REQUIREMENTS */}
      <section style={{ background: '#f8f6f6', padding: '72px 32px', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
        <Decor variant="light" />
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: accent, marginBottom: '12px' }}>Regulatory requirements</p>
            <h2 style={{ fontSize: 'clamp(28px,3vw,40px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: '#1A202C' }}>8 core compliance requirements</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '16px' }}>
            {REQUIREMENTS.map((r, i) => (
              <div key={i} style={{ background: '#fff', border: '1.5px solid #f1f5f9', borderRadius: '20px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '32px', height: '32px', background: 'rgba(236,91,19,0.08)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, flexShrink: 0, fontSize: '13px', fontWeight: 900 }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#1A202C', marginBottom: '6px' }}>{r.title}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW BITAFLY HELPS */}
      <section style={{ background: '#fff', padding: '72px 32px', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
        <Decor variant="light" />
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: accent, marginBottom: '12px' }}>How Bitafly helps</p>
            <h2 style={{ fontSize: 'clamp(24px,2.5vw,36px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: '#1A202C' }}>Automate your RAC 100 compliance</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '20px' }}>
            {[
              { need: 'F-OPS-002 flight logbook',    solution: 'Auto-generated PDF after every flight. No manual entry.', href: '/drone-logbook-colombia' },
              { need: 'F-MNT-003 battery records',   solution: 'Cycle tracking per battery serial. Retirement alerts.', href: '/mantenimiento-drones' },
              { need: 'F-HUM-005 pilot logbook',     solution: 'Individual flight hours per pilot. CPR expiry alerts.', href: '/gestion-pilotos' },
              { need: 'F-OPS-001 flight authorization',solution: 'Interactive map with KML export for AeroCivil portal.', href: '/plan-vuelo-drones' },
              { need: 'SMS documentation',           solution: 'Incident forms, hazard reporting, corrective actions.', href: '/sms-aeronautico' },
              { need: 'SORA risk assessment',        solution: 'Step-by-step GRC/ARC/SAIL calculator with PDF output.', href: '/sora' },
            ].map((r, i) => (
              <Link key={i} href={r.href} style={{ background: '#f8f6f6', border: '1.5px solid #f1f5f9', borderRadius: '16px', padding: '20px', textDecoration: 'none', display: 'block' }}>
                <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: accent, marginBottom: '6px' }}>{r.need}</div>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>{r.solution}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: '#f8f6f6', padding: '72px 32px', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
        <Decor variant="light" />
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(24px,2.5vw,32px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: '#1A202C', marginBottom: '36px', textAlign: 'center' }}>Frequently asked questions</h2>
          {faqSchema.mainEntity.map((q, i) => (
            <div key={i} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '24px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#1A202C', marginBottom: '10px' }}>{q.name}</h3>
              <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.7 }}>{q.acceptedAnswer.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#1A202C', padding: '72px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
        <Decor variant="dark" />
        <div style={{ maxWidth: '580px', margin: '0 auto' }}>
          <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: accent, marginBottom: '16px' }}>Free 6-month trial</p>
          <h2 style={{ fontSize: 'clamp(26px,3vw,40px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: '#fff', marginBottom: '16px' }}>
            Start your RAC 100 compliance today
          </h2>
          <p style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '28px', lineHeight: 1.6 }}>
            The only platform built for Colombia's AeroCivil requirements.
            No credit card. Cancel anytime.
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
