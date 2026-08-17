import Link from 'next/link';
import Image from 'next/image';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';
import SEOBreadcrumb from '@/components/seo/SEOBreadcrumb';
import SocialProofStrip from '@/components/seo/SocialProofStrip';
import RelatedReading from '@/components/seo/RelatedReading';
import Decor from '@/components/landing/Decor';
import FeatureSpotlight from '@/components/landing/FeatureSpotlight';
import { ComplianceScene } from '@/components/landing/Illustrations';

export const metadata = {
  title: 'Cumplimiento RAC 100 Drones Colombia | Bitácora Digital AeroCivil',
  description: 'Bitafly cumple con la RAC 100 de la Aeronáutica Civil de Colombia. Bitácora F-OPS-002, mantenimiento F-MNT-003, bitácora de piloto F-HUM-005 y SMS aeronáutico. Auditorías sin sorpresas.',
  keywords: ['RAC 100 drones Colombia', 'AeroCivil drones', 'cumplimiento RAC 100', 'F-OPS-002', 'F-MNT-003', 'F-HUM-005', 'normativa UAS Colombia'],
  alternates: { canonical: '/rac-100' },
  openGraph: {
    title: 'Cumplimiento RAC 100 Drones Colombia | Bitafly',
    description: 'Bitafly cumple con la RAC 100 de la Aeronáutica Civil. Bitácora, baterías y libro de piloto en PDF con tu propio código de formato (F-OPS-002, F-MNT-003, F-HUM-005 por defecto) y SMS aeronáutico.',
    url: 'https://bitafly.com/rac-100',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿Qué es la RAC 100 de la AeroCivil?", "acceptedAnswer": { "@type": "Answer", "text": "La RAC 100 (Reglamentación Aeronáutica Colombiana 100) es el marco normativo de la UAEAC que regula las operaciones con sistemas de aeronaves no tripuladas (UAS/drones) en Colombia, exigiendo bitácoras, SMS, mantenimiento documentado y autorizaciones de vuelo." } },
    { "@type": "Question", "name": "¿Qué registros exige la AeroCivil para drones?", "acceptedAnswer": { "@type": "Answer", "text": "La RAC 100 exige llevar el Maestro de Vuelo (bitácora), el Registro de Baterías, la Bitácora de Piloto y la Solicitud de Autorización de Vuelo. La AeroCivil no impone un código de formato: cada operador define su nomenclatura en su manual. Bitafly los genera en PDF con los códigos que tú definas (F-OPS-002, F-MNT-003, F-HUM-005, F-OPS-001 por defecto)." } },
    { "@type": "Question", "name": "¿Los códigos F-OPS-002, F-MNT-003 son oficiales de la AeroCivil?", "acceptedAnswer": { "@type": "Answer", "text": "No. La RAC 100 no define códigos de formato oficiales: cada empresa crea su propia nomenclatura de control documental en su manual de operaciones. Bitafly trae estos códigos por defecto y permite que cada organización los personalice para alinearlos con sus manuales." } },
    { "@type": "Question", "name": "¿Bitafly genera los reportes RAC 100 automáticamente?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Bitafly genera en PDF todos los reportes con logo corporativo, tu código de formato, versión y trazabilidad completa. Listos para presentar en inspecciones de la AeroCivil." } },
  ],
};

const s = {
  badge: { display:'inline-flex',alignItems:'center',gap:'7px',background:'rgba(236,91,19,0.08)',border:'1px solid rgba(236,91,19,0.2)',borderRadius:'9999px',padding:'5px 14px',marginBottom:'20px' },
  dot: { width:'6px',height:'6px',borderRadius:'50%',background:'#ec5b13' },
  badgeText: { fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.15em',color:'#ec5b13' },
  h1: { fontSize:'clamp(36px,4vw,52px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',lineHeight:1.02,color:'#1A202C',marginBottom:'20px' },
  span: { color:'#ec5b13' },
  desc: { fontSize:'16px',fontWeight:500,color:'#64748b',lineHeight:1.65,maxWidth:'480px',marginBottom:'28px' },
  ctas: { display:'flex',gap:'12px',flexWrap:'wrap' },
  btnPrimary: { display:'inline-flex',alignItems:'center',gap:'8px',background:'#ec5b13',color:'#fff',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none',boxShadow:'0 8px 24px rgba(236,91,19,0.3)' },
  btnGhost: { display:'inline-flex',alignItems:'center',gap:'8px',border:'1.5px solid #e2e8f0',color:'#475569',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none' },
  darkBand: { background:'#1A202C',color:'#fff',padding:'56px 32px' },
  darkBandInner: { maxWidth:'1100px',margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'32px',textAlign:'center' },
  statVal: { fontSize:'36px',fontWeight:900,color:'#ec5b13' },
  statLbl: { fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px' },
  overline: { fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.3em',color:'#ec5b13',marginBottom:'12px' },
  h2: { fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',lineHeight:1.05,color:'#1A202C',marginBottom:'16px' },
  sectionDesc: { fontSize:'15px',fontWeight:500,color:'#64748b',lineHeight:1.65,maxWidth:'600px',marginBottom:'48px' },
  cardsGrid: { display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'20px' },
  card: { background:'#fff',border:'1.5px solid #f1f5f9',borderRadius:'28px',padding:'28px' },
  cardIcon: { width:'48px',height:'48px',background:'rgba(236,91,19,0.08)',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',color:'#ec5b13',marginBottom:'16px' },
  cardTitle: { fontSize:'13px',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.01em',color:'#1A202C',marginBottom:'8px' },
  cardDesc: { fontSize:'13px',color:'#64748b',lineHeight:1.6 },
  chip: { display:'inline-block',fontFamily:'monospace',fontSize:'11px',fontWeight:700,color:'#ec5b13',background:'rgba(236,91,19,0.06)',padding:'3px 8px',borderRadius:'6px' },
  checkList: { listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:'10px' },
  checkItem: { display:'flex',alignItems:'flex-start',gap:'10px',fontSize:'13px',fontWeight:500,color:'#475569',lineHeight:1.5 },
  faqSection: { background:'#f8f6f6',padding:'80px 32px' },
  faqInner: { maxWidth:'760px',margin:'0 auto' },
  ctaBand: { background:'#1A202C',padding:'80px 32px',textAlign:'center' },
  btnWhite: { display:'inline-flex',alignItems:'center',gap:'8px',background:'#fff',color:'#1A202C',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none' },
  btnOutlineWhite: { display:'inline-flex',alignItems:'center',gap:'8px',border:'1.5px solid rgba(255,255,255,0.2)',color:'#fff',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none' },
};

export default function RAC100Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SEONav />
      <SEOBreadcrumb items={[{ label: 'Cumplimiento RAC 100' }]} />

      {/* HERO */}
      <section style={{padding:'80px 32px 72px',background:'#fff',position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="hero" />
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{maxWidth:'1100px',margin:'0 auto',gap:'56px',alignItems:'center'}}>
          <div>
            <div style={s.badge}><div style={s.dot}/><span style={s.badgeText}>UAEAC · Colombia · 2024</span></div>
            <h1 style={s.h1}>Cumplimiento <span style={s.span}>RAC 100</span> para Operadores de Drones en Colombia</h1>
            <p style={s.desc}>Bitafly traduce cada exigencia de la Reglamentación Aeronáutica Colombiana 100 en módulos digitales con trazabilidad, firma y reportes con tu propio código de formato. Auditorías sin sorpresas.</p>
            <div style={s.ctas}>
              <Link href="/registro" style={s.btnPrimary}><span className="material-symbols-outlined" style={{fontSize:'18px'}}>verified</span>Comenzar gratis</Link>
              <Link href="/reportes-auditoria" style={s.btnGhost}>Ver reportes RAC 100</Link>
            </div>
          </div>
          <ComplianceScene />
        </div>
      </section>

      {/* DARK BAND */}
      <div style={{...s.darkBand,position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="dark" />
        <div className="grid grid-cols-2 sm:grid-cols-4" style={{maxWidth:'1100px',margin:'0 auto',gap:'32px',textAlign:'center',position:'relative',zIndex:1}}>
          <div><div style={s.statVal}>4</div><div style={s.statLbl}>Reportes RAC 100 generados</div></div>
          <div><div style={s.statVal}>100%</div><div style={s.statLbl}>Trazabilidad documental</div></div>
          <div><div style={s.statVal}>0</div><div style={s.statLbl}>Excels dispersos</div></div>
          <div><div style={s.statVal}>PDF</div><div style={s.statLbl}>Exportación instantánea</div></div>
        </div>
      </div>

            {/* SPOTLIGHT */}
      <FeatureSpotlight
        decor="minimal"
        flip
        overline="Documentación lista"
        title={<>Todos tus registros RAC 100 <span style={{color:'#ec5b13'}}>en PDF</span></>}
        desc="Cuando llega la inspección de la AeroCivil, exportas en segundos el Maestro de Vuelo, el Registro de Baterías y la Bitácora de Piloto con tu logo, código de formato y versión."
        bullets={[
          'Maestro de Vuelo, Baterías y Piloto en PDF',
          'Logo, código de formato y versión corporativa',
          'Trazabilidad y firma para auditoría',
          'Códigos configurables según tu manual',
        ]}
      >
        <Image
          src="/screenshots/reportes.jpg"
          alt="Pantalla de Reportes de Bitafly con formatos RAC 100"
          width={1568}
          height={718}
          className="w-full h-auto rounded-3xl shadow-2xl border border-slate-200"
        />
      </FeatureSpotlight>

      {/* QUÉ ES RAC 100 */}
      <section style={{padding:'80px 32px',background:'#f8f6f6',position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="light" />
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'56px'}}>
            <div style={s.overline}>Marco normativo</div>
            <h2 style={s.h2}>¿Qué exige la <span style={s.span}>RAC 100</span> a los operadores UAS?</h2>
            <p style={s.sectionDesc}>La Reglamentación Aeronáutica Colombiana 100 define los requisitos operacionales, documentales y de seguridad para todos los operadores de sistemas de aeronaves no tripuladas en Colombia.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{gap:'20px'}}>
            <article style={s.card}>
              <div style={s.cardIcon}><span className="material-symbols-outlined">menu_book</span></div>
              <h3 style={s.cardTitle}>Bitácora de Vuelo</h3>
              <p style={s.cardDesc}>Registro obligatorio de cada operación con datos de aeronave, tripulación, misión y tiempos. Formato <span style={s.chip}>F-OPS-002</span> Maestro de Vuelo.</p>
            </article>
            <article style={s.card}>
              <div style={s.cardIcon}><span className="material-symbols-outlined">build</span></div>
              <h3 style={s.cardTitle}>Mantenimiento Documentado</h3>
              <p style={s.cardDesc}>Trazabilidad de intervenciones técnicas y gestión de baterías LiPo. Formato <span style={s.chip}>F-MNT-003</span> Registro de Baterías.</p>
            </article>
            <article style={s.card}>
              <div style={s.cardIcon}><span className="material-symbols-outlined">badge</span></div>
              <h3 style={s.cardTitle}>Bitácora de Piloto</h3>
              <p style={s.cardDesc}>Libro de vuelo individual por tripulante con horas totales acumuladas y vigencia de certificados. Formato <span style={s.chip}>F-HUM-005</span>.</p>
            </article>
            <article style={s.card}>
              <div style={s.cardIcon}><span className="material-symbols-outlined">health_and_safety</span></div>
              <h3 style={s.cardTitle}>SMS Aeronáutico</h3>
              <p style={s.cardDesc}>Sistema de Gestión de Seguridad Operacional con registro de incidentes, acciones correctivas y análisis de tendencias de riesgo.</p>
            </article>
            <article style={s.card}>
              <div style={s.cardIcon}><span className="material-symbols-outlined">event_available</span></div>
              <h3 style={s.cardTitle}>Autorizaciones de Vuelo</h3>
              <p style={s.cardDesc}>Solicitud de operaciones ante la UAEAC con coordenadas, aeronave, tripulación y póliza vigente. Formato <span style={s.chip}>F-OPS-001</span>.</p>
            </article>
            <article style={s.card}>
              <div style={s.cardIcon}><span className="material-symbols-outlined">verified_user</span></div>
              <h3 style={s.cardTitle}>Roles Operacionales</h3>
              <p style={s.cardDesc}>Estructura de 5 roles según la RAC 100: Administrador, Gerente SMS, Jefe de Pilotos, Piloto y Superadmin con accesos granulares.</p>
            </article>
          </div>
        </div>
      </section>

      {/* FORMATOS OFICIALES */}
      <section style={{padding:'80px 32px',background:'#fff'}}>
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{maxWidth:'1100px',margin:'0 auto',gap:'56px',alignItems:'center'}}>
          <div>
            <div style={s.overline}>Formatos RAC 100 · configurables</div>
            <h2 style={s.h2}>Todos los registros que pide la <span style={s.span}>AeroCivil</span></h2>
            <p style={{fontSize:'14px',color:'#64748b',lineHeight:1.75,marginBottom:'24px'}}>Bitafly genera cada registro exigido por la RAC 100 en PDF con logo corporativo, versión y firma digital. Los códigos de formato no son oficiales de la AeroCivil: cada operador los define en su manual y tú los personalizas en Bitafly (vienen por defecto los de abajo).</p>
            <ul style={s.checkList}>
              <li style={s.checkItem}><span className="material-symbols-outlined" style={{fontSize:'18px',color:'#ec5b13',flexShrink:0}}>check_circle</span><div><strong>F-OPS-002</strong> — Maestro de Vuelo (bitácora digital)</div></li>
              <li style={s.checkItem}><span className="material-symbols-outlined" style={{fontSize:'18px',color:'#ec5b13',flexShrink:0}}>check_circle</span><div><strong>F-MNT-003</strong> — Registro de Baterías LiPo</div></li>
              <li style={s.checkItem}><span className="material-symbols-outlined" style={{fontSize:'18px',color:'#ec5b13',flexShrink:0}}>check_circle</span><div><strong>F-HUM-005</strong> — Bitácora de Piloto individual</div></li>
              <li style={s.checkItem}><span className="material-symbols-outlined" style={{fontSize:'18px',color:'#ec5b13',flexShrink:0}}>check_circle</span><div><strong>F-OPS-001</strong> — Solicitud de Autorización de Vuelo</div></li>
            </ul>
          </div>
          <div style={{background:'#1A202C',borderRadius:'32px',padding:'40px',display:'flex',flexDirection:'column',gap:'20px'}}>
            <div style={s.overline}>Cobertura normativa</div>
            {[
              { code:'F-OPS-002', name:'Bitácora Digital', ok:true },
              { code:'F-MNT-003', name:'Control de Baterías', ok:true },
              { code:'F-HUM-005', name:'Libro de Piloto', ok:true },
              { code:'F-OPS-001', name:'Autorización de Vuelo', ok:true },
              { code:'SMS', name:'Gestión de Seguridad', ok:true },
            ].map(item => (
              <div key={item.code} style={{background:'rgba(255,255,255,0.04)',borderRadius:'14px',padding:'14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <span style={s.chip}>{item.code}</span>
                  <div style={{fontSize:'12px',fontWeight:700,color:'#fff',marginTop:'6px'}}>{item.name}</div>
                </div>
                <span className="material-symbols-outlined" style={{color:'#22c55e',fontSize:'20px'}}>check_circle</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{...s.faqSection,position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="light" />
        <div style={s.faqInner}>
          <div style={{textAlign:'center',marginBottom:'48px'}}>
            <div style={s.overline}>Normativa RAC 100 — Preguntas</div>
            <h2 style={s.h2}>Todo sobre el <span style={s.span}>cumplimiento</span></h2>
          </div>
          {faqSchema.mainEntity.map((item, i) => (
            <details key={i} style={{background:'#fff',border:'1.5px solid #f1f5f9',borderRadius:'18px',overflow:'hidden',marginBottom:'10px'}}>
              <summary style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px',cursor:'pointer',listStyle:'none',fontSize:'14px',fontWeight:900,color:'#1A202C'}}>
                {item.name}
                <span className="material-symbols-outlined faq-chevron" style={{fontSize:'20px',color:'#ec5b13',flexShrink:0}}>expand_more</span>
              </summary>
              <p style={{padding:'0 22px 18px',fontSize:'13px',color:'#64748b',lineHeight:1.7}}>{item.acceptedAnswer.text}</p>
            </details>
          ))}
        </div>
      </section>

      <SocialProofStrip heading="Operadores que confían en Bitafly para su cumplimiento RAC 100" />

      {/* CTA */}
      <div style={{...s.ctaBand,position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="dark" />
        <div style={{position:'relative',zIndex:1}}>
        <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#fff',marginBottom:'12px'}}>Tu operación <span style={s.span}>en regla</span> desde el primer vuelo</h2>
        <p style={{fontSize:'15px',color:'#94a3b8',maxWidth:'560px',margin:'0 auto 32px'}}>Bitafly cumple la RAC 100 de la AeroCivil por ti. Empieza gratis hoy.</p>
        <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
          <Link href="/registro" style={s.btnWhite}><span className="material-symbols-outlined" style={{fontSize:'18px'}}>verified</span>Comenzar gratis</Link>
          <Link href="/reportes-auditoria" style={s.btnOutlineWhite}>Ver reportes RAC 100</Link>
        </div>
        </div>
      </div>

      <RelatedReading items={[
        { href: '/blog/checklist-vuelo-drones-rac-100-colombia', title: 'Checklist de vuelo para drones RAC 100: todo lo que debes verificar' },
        { href: '/blog/formatos-aerocivil-drones-colombia', title: 'Formatos de control documental RAC 100 para drones' },
        { href: '/blog/como-registrar-drone-uaeac-colombia-2025', title: 'Cómo registrar tu dron ante la UAEAC en Colombia' },
      ]} />

      <SEOFooter brandDesc="Cumplimiento RAC 100 para operadores UAS en Colombia. F-OPS-002, F-MNT-003, F-HUM-005 y SMS aeronáutico." />
    </>
  );
}
