import Script from 'next/script';
import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';

export const metadata = {
  title: 'Autorizaciones de Vuelo AeroCivil para Drones F-OPS-001 | Bitafly Colombia',
  description: 'Genera el formato F-OPS-001 de autorización de vuelo para drones ante la AeroCivil en segundos. Coordenadas, polígono de operación, póliza vigente y firma digital. Cumplimiento RAC 100.',
  keywords: ['autorización vuelo drones AeroCivil', 'F-OPS-001', 'permiso vuelo drone Colombia', 'UAEAC drones', 'autorización UAS Colombia'],
  alternates: { canonical: '/autorizaciones-aerocivil' },
  openGraph: {
    title: 'Autorizaciones de Vuelo AeroCivil para Drones F-OPS-001 | Bitafly',
    description: 'Genera el F-OPS-001 en menos de 60 segundos. Datos pre-poblados, póliza vinculada, PDF listo para radicar.',
    url: 'https://bitafly.com/autorizaciones-aerocivil',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿Qué es el formato F-OPS-001 de la AeroCivil?", "acceptedAnswer": { "@type": "Answer", "text": "El F-OPS-001 es el formato de Solicitud de Autorización de Vuelo exigido por la UAEAC para operaciones de drones (UAS) en Colombia. Incluye datos de la aeronave, tripulación certificada, zona de operación con coordenadas, póliza de responsabilidad civil vigente y firma del responsable de la operación." } },
    { "@type": "Question", "name": "¿Necesito autorización de la AeroCivil para volar un dron en Colombia?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Según la RAC 100, las operaciones comerciales o de trabajo aéreo con drones en Colombia requieren autorización previa de la UAEAC mediante el formato F-OPS-001. Bitafly genera este formato automáticamente con los datos de tu aeronave y tripulación registrados en la plataforma." } },
    { "@type": "Question", "name": "¿Puedo reutilizar una autorización anterior para una zona similar?", "acceptedAnswer": { "@type": "Answer", "text": "Bitafly guarda el historial completo de autorizaciones. Puedes duplicar una autorización anterior y modificar la fecha, aeronave o coordenadas para generar una nueva solicitud rápidamente sin empezar desde cero." } },
    { "@type": "Question", "name": "¿Qué información debe incluir el F-OPS-001?", "acceptedAnswer": { "@type": "Answer", "text": "El F-OPS-001 debe incluir: datos del operador certificado (ESUAS), aeronave matriculada con número de serie, tripulación con certificados vigentes, zona de operación con coordenadas geográficas, póliza de responsabilidad civil vigente, fecha y hora de la operación, y firma del responsable." } },
  ],
};

const accent = '#ec5b13';

export default function AutorizacionesAerocivilPage() {
  return (
    <>
      <Script id="faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SEONav />

      {/* HERO */}
      <section style={{padding:'80px 32px 72px',background:'#fff'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'56px',alignItems:'center'}}>
          <div>
            <div style={{display:'inline-flex',alignItems:'center',gap:'7px',background:'rgba(236,91,19,0.08)',border:'1px solid rgba(236,91,19,0.2)',borderRadius:'9999px',padding:'5px 14px',marginBottom:'20px'}}>
              <div style={{width:'6px',height:'6px',borderRadius:'50%',background:accent}}/>
              <span style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.15em',color:accent}}>Formato F-OPS-001 · UAEAC</span>
            </div>
            <h1 style={{fontSize:'clamp(36px,4vw,52px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',lineHeight:1.02,color:'#1A202C',marginBottom:'20px'}}>
              Autorizaciones de Vuelo <span style={{color:accent}}>AeroCivil</span> para Drones en Segundos
            </h1>
            <p style={{fontSize:'16px',fontWeight:500,color:'#64748b',lineHeight:1.65,maxWidth:'480px',marginBottom:'28px'}}>
              Genera el formato F-OPS-001 con coordenadas del polígono de operación, aeronave matriculada, póliza vigente y firma digital. Listo para radicar ante la UAEAC.
            </p>
            <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
              <Link href="/registro" style={{display:'inline-flex',alignItems:'center',gap:'8px',background:accent,color:'#fff',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none',boxShadow:'0 8px 24px rgba(236,91,19,0.3)'}}>
                <span className="material-symbols-outlined" style={{fontSize:'18px'}}>event_available</span>Comenzar gratis
              </Link>
              <Link href="/rac-100" style={{display:'inline-flex',alignItems:'center',gap:'8px',border:'1.5px solid #e2e8f0',color:'#475569',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none'}}>
                Ver cumplimiento RAC 100
              </Link>
            </div>
            <p style={{fontSize:'11px',fontWeight:700,color:'#94a3b8',marginTop:'14px'}}>Formato F-OPS-001 oficial · Datos vinculados desde tu flota · PDF instantáneo</p>
          </div>
          {/* Auth form mockup */}
          <div style={{background:'#fff',border:'1.5px solid #e2e8f0',borderRadius:'24px',overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,0.06)'}}>
            <div style={{background:'#1A202C',padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:'11px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',color:'#fff'}}>Solicitud de Autorización</div>
              <span style={{fontFamily:'monospace',fontSize:'11px',fontWeight:700,color:accent,background:'rgba(236,91,19,0.06)',padding:'3px 8px',borderRadius:'6px'}}>F-OPS-001</span>
            </div>
            <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:'10px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'10px',padding:'10px'}}><div style={{fontSize:'8px',fontWeight:900,textTransform:'uppercase',color:'#94a3b8'}}>Aeronave</div><div style={{fontSize:'11px',fontWeight:700,color:'#1A202C',marginTop:'3px'}}>MAT350-CO-0041</div></div>
                <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'10px',padding:'10px'}}><div style={{fontSize:'8px',fontWeight:900,textTransform:'uppercase',color:'#94a3b8'}}>PIC</div><div style={{fontSize:'11px',fontWeight:700,color:'#1A202C',marginTop:'3px'}}>C. Martínez</div></div>
              </div>
              <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'10px',padding:'10px'}}>
                <div style={{fontSize:'8px',fontWeight:900,textTransform:'uppercase',color:'#94a3b8',marginBottom:'6px'}}>Zona de Operación</div>
                <div style={{background:'#1A202C',borderRadius:'8px',height:'60px',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
                  <span className="material-symbols-outlined" style={{fontSize:'18px',color:accent}}>map</span>
                  <span style={{fontSize:'10px',fontWeight:700,color:'#94a3b8'}}>4.7110° N, 74.0721° O · Radio 500m</span>
                </div>
              </div>
              <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'10px',padding:'10px',display:'flex',gap:'8px',alignItems:'center'}}>
                <span className="material-symbols-outlined" style={{fontSize:'16px',color:'#22c55e'}}>verified</span>
                <div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',color:'#16a34a'}}>Póliza vigente</div><div style={{fontSize:'10px',fontWeight:500,color:'#15803d'}}>RC-2025-0089 · Vence 31 Dic 2025</div></div>
              </div>
              <div style={{background:accent,borderRadius:'10px',padding:'10px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',color:'#fff'}}>Generar F-OPS-001 PDF</span>
                <span className="material-symbols-outlined" style={{fontSize:'18px',color:'#fff'}}>picture_as_pdf</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DARK BAND */}
      <div style={{background:'#1A202C',color:'#fff',padding:'56px 32px'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'32px',textAlign:'center'}}>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>F-OPS-001</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Formato oficial UAEAC</div></div>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>&lt;60s</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Tiempo de generación</div></div>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>PDF</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Listo para radicar</div></div>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>100%</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Campos obligatorios</div></div>
        </div>
      </div>

      {/* FUNCIONES */}
      <section style={{padding:'80px 32px',background:'#f8f6f6'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'56px'}}>
            <div style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.3em',color:accent,marginBottom:'12px'}}>Módulo de autorizaciones</div>
            <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#1A202C'}}>Del registro al formato oficial <span style={{color:accent}}>en un clic</span></h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'20px'}}>
            {[
              { icon:'edit_square', title:'Datos Pre-poblados', desc:'La aeronave matriculada, el PIC certificado y la póliza vigente se vinculan automáticamente desde tu perfil de organización. Sin re-digitar datos en cada solicitud.' },
              { icon:'map', title:'Coordenadas y Polígono', desc:'Ingresa las coordenadas de la zona de operación manualmente o mediante el selector de mapa integrado. Radio de operación, altitud máxima y tipo de espacio aéreo.' },
              { icon:'label_important', title:'Póliza de Responsabilidad Civil', desc:'Vinculación de la póliza de RC vigente con número de póliza, aseguradora y fecha de vencimiento. Alerta automática 30 días antes del vencimiento.' },
              { icon:'gavel', title:'Historial de Autorizaciones', desc:'Registro completo de todas las autorizaciones emitidas con estado (pendiente, aprobada, vencida) y acceso rápido a cada PDF generado.' },
              { icon:'flight_takeoff', title:'Vinculación con Bitácora', desc:'Cada vuelo registrado en la bitácora puede vincularse a su autorización correspondiente, creando el expediente completo de la operación.' },
              { icon:'picture_as_pdf', title:'PDF con Logo Corporativo', desc:'El F-OPS-001 generado incluye el logo de tu organización, código de formato oficial, versión y firma digital del responsable. Listo para presentar o radicar.' },
            ].map(item => (
              <article key={item.icon} style={{background:'#fff',border:'1.5px solid #f1f5f9',borderRadius:'28px',padding:'28px'}}>
                <div style={{width:'48px',height:'48px',background:'rgba(236,91,19,0.08)',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',color:accent,marginBottom:'16px'}}><span className="material-symbols-outlined">{item.icon}</span></div>
                <h3 style={{fontSize:'13px',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.01em',color:'#1A202C',marginBottom:'8px'}}>{item.title}</h3>
                <p style={{fontSize:'13px',color:'#64748b',lineHeight:1.6}}>{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{background:'#f8f6f6',padding:'80px 32px'}}>
        <div style={{maxWidth:'760px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'48px'}}>
            <div style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.3em',color:accent,marginBottom:'12px'}}>Autorizaciones AeroCivil — Preguntas</div>
            <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#1A202C'}}>Todo sobre el <span style={{color:accent}}>F-OPS-001</span></h2>
          </div>
          {faqSchema.mainEntity.map((item, i) => (
            <details key={i} style={{background:'#fff',border:'1.5px solid #f1f5f9',borderRadius:'18px',overflow:'hidden',marginBottom:'10px'}}>
              <summary style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px',cursor:'pointer',listStyle:'none',fontSize:'14px',fontWeight:900,color:'#1A202C'}}>
                {item.name}
                <span className="material-symbols-outlined" style={{fontSize:'20px',color:accent,flexShrink:0}}>expand_more</span>
              </summary>
              <p style={{padding:'0 22px 18px',fontSize:'13px',color:'#64748b',lineHeight:1.7}}>{item.acceptedAnswer.text}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div style={{background:'#1A202C',padding:'80px 32px',textAlign:'center'}}>
        <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#fff',marginBottom:'12px'}}>Tu F-OPS-001 en <span style={{color:accent}}>menos de 60 segundos</span></h2>
        <p style={{fontSize:'15px',color:'#94a3b8',maxWidth:'560px',margin:'0 auto 32px'}}>Datos de tu flota pre-poblados, póliza vinculada, PDF listo para radicar ante la AeroCivil.</p>
        <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
          <Link href="/registro" style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'#fff',color:'#1A202C',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none'}}>
            <span className="material-symbols-outlined" style={{fontSize:'18px'}}>event_available</span>Comenzar gratis
          </Link>
          <Link href="/rac-100" style={{display:'inline-flex',alignItems:'center',gap:'8px',border:'1.5px solid rgba(255,255,255,0.2)',color:'#fff',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none'}}>
            Ver cumplimiento RAC 100
          </Link>
        </div>
      </div>

      <SEOFooter brandDesc="Autorizaciones de vuelo AeroCivil F-OPS-001 para operadores UAS en Colombia." />
    </>
  );
}
