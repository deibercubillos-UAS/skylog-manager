import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';

export const metadata = {
  title: 'Software para Operadores UAS Certificados en Colombia | Bitafly',
  description: 'Bitafly es la plataforma diseñada para operadores UAS certificados ante la AeroCivil en Colombia. Gestión de flota, tripulación, bitácora RAC 100, SMS y autorizaciones de vuelo en una sola plataforma.',
  keywords: ['operadores UAS Colombia', 'ESUAS AeroCivil', 'certificación operador drones Colombia', 'software ESUAS', 'plataforma UAS Colombia'],
  alternates: { canonical: '/operadores-uas' },
  openGraph: {
    title: 'Software para Operadores UAS Certificados en Colombia | Bitafly',
    description: 'Plataforma para operadores ESUAS. 5 roles RAC 100, todos los módulos, acceso gratuito durante certificación.',
    url: 'https://bitafly.com/operadores-uas',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿Qué es un Explotador de Sistemas UAS (ESUAS)?", "acceptedAnswer": { "@type": "Answer", "text": "El ESUAS (Explotador de Sistema de Aeronave No Tripulada) es la figura jurídica establecida por la UAEAC en la RAC 100 para las empresas u operadores individuales que realizan operaciones comerciales con drones en Colombia. La certificación como ESUAS es obligatoria para operaciones de trabajo aéreo." } },
    { "@type": "Question", "name": "¿Qué roles de usuario tiene Bitafly?", "acceptedAnswer": { "@type": "Answer", "text": "Bitafly tiene 5 roles: Superadmin (gestión global del SaaS), Administrador (gestión completa de la organización), Gerente SMS (gestión de seguridad operacional), Jefe de Pilotos (gestión de tripulación y programación) y Piloto (registro de vuelos y reportes de incidentes)." } },
    { "@type": "Question", "name": "¿Bitafly sirve para un piloto individual o solo para empresas?", "acceptedAnswer": { "@type": "Answer", "text": "Bitafly sirve para ambos. El plan gratuito (6 meses) está diseñado para pilotos individuales con un dron. Los planes Escuadrilla y Flota son para empresas con múltiples aeronaves y tripulantes. El plan Enterprise es para grandes operadores." } },
    { "@type": "Question", "name": "¿Bitafly ayuda durante el proceso de certificación ESUAS?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Bitafly ofrece acceso gratuito durante todo el proceso de certificación ante la AeroCivil. Solo necesitas contactarnos con tu número de radicado y activamos tu cuenta con el plan que necesites sin costo hasta obtener la certificación." } },
  ],
};

const accent = '#ec5b13';

export default function OperadoresUASPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SEONav />

      {/* HERO */}
      <section style={{padding:'80px 32px 72px',background:'#fff'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <div style={{maxWidth:'720px'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:'7px',background:'rgba(236,91,19,0.08)',border:'1px solid rgba(236,91,19,0.2)',borderRadius:'9999px',padding:'5px 14px',marginBottom:'20px'}}>
              <div style={{width:'6px',height:'6px',borderRadius:'50%',background:accent}}/>
              <span style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.15em',color:accent}}>ESUAS · AeroCivil · Colombia</span>
            </div>
            <h1 style={{fontSize:'clamp(36px,4vw,52px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',lineHeight:1.02,color:'#1A202C',marginBottom:'20px'}}>
              Software para <span style={{color:accent}}>Operadores UAS</span> Certificados en Colombia
            </h1>
            <p style={{fontSize:'16px',fontWeight:500,color:'#64748b',lineHeight:1.65,maxWidth:'480px',marginBottom:'28px'}}>
              Desde el piloto individual hasta el gran explotador ESUAS. Bitafly acompaña toda la cadena de cumplimiento RAC 100: flota, tripulación, bitácora, SMS y autorizaciones en una sola plataforma.
            </p>
            <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
              <Link href="/registro" style={{display:'inline-flex',alignItems:'center',gap:'8px',background:accent,color:'#fff',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none',boxShadow:'0 8px 24px rgba(236,91,19,0.3)'}}>
                <span className="material-symbols-outlined" style={{fontSize:'18px'}}>verified_user</span>Comenzar gratis
              </Link>
              <Link href="/precios" style={{display:'inline-flex',alignItems:'center',gap:'8px',border:'1.5px solid #e2e8f0',color:'#475569',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none'}}>
                Ver planes y precios
              </Link>
            </div>
            <p style={{fontSize:'11px',fontWeight:700,color:'#94a3b8',marginTop:'14px'}}>Gratis durante certificación ESUAS · Sin tarjeta de crédito</p>
          </div>
        </div>
      </section>

      {/* DARK BAND */}
      <div style={{background:'#1A202C',color:'#fff',padding:'56px 32px'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'32px',textAlign:'center'}}>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>5</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Roles operacionales</div></div>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>4</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Formatos RAC 100</div></div>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>∞</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Aeronaves y usuarios</div></div>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>100%</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>En la nube</div></div>
        </div>
      </div>

      {/* PARA QUIÉN */}
      <section style={{padding:'80px 32px',background:'#f8f6f6'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'56px'}}>
            <div style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.3em',color:accent,marginBottom:'12px'}}>Para cada tipo de operador</div>
            <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#1A202C'}}>Bitafly escala con <span style={{color:accent}}>tu operación</span></h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'20px'}}>
            {[
              { plan:'Plan Piloto', planBg:'rgba(236,91,19,0.08)', planBorder:'rgba(236,91,19,0.2)', planColor:accent, icon:'person_check', title:'Piloto Autónomo', desc:'Un dron, un piloto. Bitácora digital ilimitada, mantenimiento con alertas, gestión de baterías y reporte F-OPS-002 en PDF. 6 meses gratuito.', featured:false },
              { plan:'Plan Escuadrilla', planBg:'rgba(26,32,44,0.06)', planBorder:'rgba(26,32,44,0.1)', planColor:'#1A202C', icon:'groups', title:'Pequeña Empresa', desc:'Hasta 3 aeronaves y 4 usuarios con 3 roles operacionales. Autorizaciones F-OPS-001, SMS básico y reportes PDF Maestro de Vuelo y Baterías.', featured:false },
              { plan:'Plan Flota ★', planBg:accent, planBorder:accent, planColor:'white', icon:'admin_panel_settings', title:'Empresa Mediana / ESUAS', desc:'Hasta 15 aeronaves y 15 usuarios con los 5 roles RAC 100. SMS completo, auditoría, protocolos personalizables y todos los reportes oficiales.', featured:true },
            ].map(item => (
              <article key={item.icon} style={{background:'#fff',border:`1.5px solid ${item.featured?'rgba(236,91,19,0.3)':'#f1f5f9'}`,borderRadius:'28px',padding:'28px',boxShadow:item.featured?'0 8px 24px rgba(0,0,0,0.08)':'none'}}>
                <div style={{display:'inline-flex',alignItems:'center',gap:'6px',background:item.planBg,border:`1px solid ${item.planBorder}`,borderRadius:'9999px',padding:'4px 10px',marginBottom:'14px'}}>
                  <span style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',color:item.planColor}}>{item.plan}</span>
                </div>
                <div style={{width:'48px',height:'48px',background:'rgba(236,91,19,0.08)',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',color:accent,marginBottom:'16px'}}><span className="material-symbols-outlined">{item.icon}</span></div>
                <h3 style={{fontSize:'13px',fontWeight:900,textTransform:'uppercase',color:'#1A202C',marginBottom:'8px'}}>{item.title}</h3>
                <p style={{fontSize:'13px',color:'#64748b',lineHeight:1.6,marginBottom:'12px'}}>{item.desc}</p>
                <Link href="/precios" style={{display:'inline-flex',alignItems:'center',gap:'4px',fontSize:'11px',fontWeight:900,color:accent,textDecoration:'none',textTransform:'uppercase',letterSpacing:'0.06em'}}>
                  Ver plan <span className="material-symbols-outlined" style={{fontSize:'14px'}}>arrow_forward</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ROLES + ESUAS BANNER */}
      <section style={{padding:'80px 32px',background:'#fff'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'56px',alignItems:'center'}}>
          <div>
            <div style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.3em',color:accent,marginBottom:'12px'}}>Estructura corporativa real</div>
            <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#1A202C',marginBottom:'16px'}}>5 roles operacionales <span style={{color:accent}}>según la RAC 100</span></h2>
            <p style={{fontSize:'14px',color:'#64748b',lineHeight:1.75,marginBottom:'24px'}}>Bitafly replica la jerarquía operacional exigida por la UAEAC para operadores certificados. Cada rol tiene acceso a los módulos que le corresponden según la normativa.</p>
            <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:'10px'}}>
              {[
                { label:'Administrador', desc:'Gestión completa de la organización' },
                { label:'Gerente SMS', desc:'Seguridad operacional y gestión de incidentes' },
                { label:'Jefe de Pilotos', desc:'Tripulación, certificados y programación' },
                { label:'Piloto', desc:'Registro de vuelos y reporte de incidentes' },
                { label:'Superadmin', desc:'Gestión global del SaaS (solo Bitafly)' },
              ].map(role => (
                <li key={role.label} style={{display:'flex',alignItems:'flex-start',gap:'10px',fontSize:'13px',fontWeight:500,color:'#475569',lineHeight:1.5}}>
                  <span className="material-symbols-outlined" style={{fontSize:'18px',color:accent,flexShrink:0,marginTop:'1px'}}>check_circle</span>
                  <div><strong>{role.label}</strong> — {role.desc}</div>
                </li>
              ))}
            </ul>
          </div>
          <div style={{background:'#1A202C',borderRadius:'32px',padding:'40px',display:'flex',flexDirection:'column',gap:'20px'}}>
            <div style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.3em',color:accent}}>Oferta especial</div>
            <h3 style={{fontSize:'18px',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.02em',color:'#fff',lineHeight:1.2}}>¿Certificando como ESUAS ante la AeroCivil?</h3>
            <p style={{fontSize:'13px',color:'#94a3b8',lineHeight:1.7}}>Accede a Bitafly <strong style={{color:'#fff'}}>sin costo</strong> durante todo tu proceso de certificación. Sabemos que cumplir con la RAC 100 tiene un costo y queremos ser parte de la solución.</p>
            <a href="mailto:soporte@bitafly.com" style={{display:'inline-flex',alignItems:'center',gap:'8px',background:accent,color:'#fff',padding:'12px 20px',borderRadius:'14px',fontSize:'11px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none',marginTop:'4px'}}>
              <span className="material-symbols-outlined" style={{fontSize:'16px'}}>gavel</span>Solicitar acceso gratuito
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{background:'#f8f6f6',padding:'80px 32px'}}>
        <div style={{maxWidth:'760px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'48px'}}>
            <div style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.3em',color:accent,marginBottom:'12px'}}>Operadores UAS — Preguntas</div>
            <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#1A202C'}}>Todo sobre <span style={{color:accent}}>certificación ESUAS</span></h2>
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
        <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#fff',marginBottom:'12px'}}>El software que <span style={{color:accent}}>habla tu idioma</span> aeronáutico</h2>
        <p style={{fontSize:'15px',color:'#94a3b8',maxWidth:'560px',margin:'0 auto 32px'}}>Bitafly fue construido por personas que entienden la operación UAS en Colombia. Empieza hoy.</p>
        <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
          <Link href="/registro" style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'#fff',color:'#1A202C',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none'}}>
            <span className="material-symbols-outlined" style={{fontSize:'18px'}}>rocket_launch</span>Comenzar gratis
          </Link>
          <Link href="/precios" style={{display:'inline-flex',alignItems:'center',gap:'8px',border:'1.5px solid rgba(255,255,255,0.2)',color:'#fff',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none'}}>
            Ver planes
          </Link>
        </div>
      </div>

      <SEOFooter brandDesc="Software para operadores UAS certificados en Colombia. ESUAS · RAC 100 · AeroCivil." />
    </>
  );
}
