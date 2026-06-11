import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';
import Decor from '@/components/landing/Decor';
import FeatureSpotlight from '@/components/landing/FeatureSpotlight';
import { SmsSafetyScene } from '@/components/landing/Illustrations';

export const metadata = {
  title: 'SMS Aeronáutico para Operadores de Drones UAS Colombia',
  description: 'Sistema de Gestión de Seguridad (SMS) aeronáutico para operadores UAS en Colombia. Clasificación de incidentes, accidentes y eventos de seguridad según RAC 100. Trazabilidad completa para auditorías AeroCivil.',
  keywords: ['SMS aeronáutico drones', 'sistema gestión seguridad UAS', 'incidentes drones Colombia', 'seguridad operacional UAS', 'RAC 100 SMS'],
  alternates: { canonical: '/sms-aeronautico' },
  openGraph: {
    title: 'SMS Aeronáutico para Operadores UAS en Colombia | Bitafly',
    description: 'Sistema de Gestión de Seguridad Operacional para drones. Clasificación RAC 100, trazabilidad y reportes para auditorías AeroCivil.',
    url: 'https://bitafly.com/sms-aeronautico',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿Qué es el SMS aeronáutico para operadores de drones?", "acceptedAnswer": { "@type": "Answer", "text": "El SMS (Safety Management System) aeronáutico es el Sistema de Gestión de Seguridad Operacional exigido por la RAC 100 de la AeroCivil para operadores UAS en Colombia. Requiere registrar, clasificar y dar seguimiento a todos los incidentes, eventos de seguridad y accidentes que ocurran en las operaciones de drones." } },
    { "@type": "Question", "name": "¿Qué tipos de eventos clasifica el SMS de Bitafly?", "acceptedAnswer": { "@type": "Answer", "text": "Bitafly clasifica los eventos de seguridad en tres categorías según la RAC 100: Incidente (evento sin daño), Incidente Grave (evento con potencial de accidente) y Accidente (evento con daño material o personal). Cada uno incluye narrativa, acciones correctivas y trazabilidad." } },
    { "@type": "Question", "name": "¿Qué operadores UAS están obligados a tener un SMS?", "acceptedAnswer": { "@type": "Answer", "text": "Según la RAC 100, todos los operadores certificados como Explotadores de Sistemas UAS (ESUAS) ante la AeroCivil están obligados a implementar un Sistema de Gestión de la Seguridad Operacional. Bitafly digitaliza y automatiza este requisito." } },
    { "@type": "Question", "name": "¿El Gerente SMS tiene acceso diferenciado en Bitafly?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Bitafly tiene un rol específico de Gerente SMS con acceso completo al módulo de seguridad, incluyendo la creación, edición, cierre de eventos y generación de reportes. Los pilotos pueden reportar eventos pero no editarlos una vez enviados." } },
  ],
};

const accent = '#ec5b13';

export default function SMSAeronauticoPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SEONav />

      {/* HERO */}
      <section style={{padding:'80px 32px 72px',background:'#fff',position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="hero" />
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{maxWidth:'1100px',margin:'0 auto',gap:'56px',alignItems:'center'}}>
          <div>
            <div style={{display:'inline-flex',alignItems:'center',gap:'7px',background:'rgba(236,91,19,0.08)',border:'1px solid rgba(236,91,19,0.2)',borderRadius:'9999px',padding:'5px 14px',marginBottom:'20px'}}>
              <div style={{width:'6px',height:'6px',borderRadius:'50%',background:accent}}/>
              <span style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.15em',color:accent}}>SMS · Seguridad Operacional RAC 100</span>
            </div>
            <h1 style={{fontSize:'clamp(36px,4vw,52px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',lineHeight:1.02,color:'#1A202C',marginBottom:'20px'}}>
              SMS Aeronáutico para <span style={{color:accent}}>Operadores UAS</span> en Colombia
            </h1>
            <p style={{fontSize:'16px',fontWeight:500,color:'#64748b',lineHeight:1.65,maxWidth:'480px',marginBottom:'28px'}}>
              Sistema de Gestión de Seguridad Operacional con clasificación de incidentes, narrativa, acciones correctivas y trazabilidad completa. Listo para auditorías de la AeroCivil.
            </p>
            <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
              <Link href="/registro" style={{display:'inline-flex',alignItems:'center',gap:'8px',background:accent,color:'#fff',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none',boxShadow:'0 8px 24px rgba(236,91,19,0.3)'}}>
                <span className="material-symbols-outlined" style={{fontSize:'18px'}}>health_and_safety</span>Comenzar gratis
              </Link>
              <Link href="/rac-100" style={{display:'inline-flex',alignItems:'center',gap:'8px',border:'1.5px solid #e2e8f0',color:'#475569',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none'}}>
                Ver cumplimiento RAC 100
              </Link>
            </div>
            <p style={{fontSize:'11px',fontWeight:700,color:'#94a3b8',marginTop:'14px'}}>SMS incluido en todos los planes · Auditorías sin sorpresas</p>
          </div>
          {/* SMS visual */}
          <div style={{background:'#1A202C',borderRadius:'20px',padding:'20px'}}>
            <div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.15em',color:accent,marginBottom:'14px'}}>Sistema SMS — Eventos Recientes</div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {[
                { color:'#ef4444', label:'INCIDENTE GRAVE', id:'SMS-2025-003', desc:'Pérdida de enlace de control por 8 segundos', date:'05 Mar 2025 · Acción correctiva: Actualización firmware' },
                { color:'#f59e0b', label:'INCIDENTE', id:'SMS-2025-004', desc:'Interferencia GPS en zona urbana', date:'20 Abr 2025 · Estado: Cerrado' },
                { color:'#22c55e', label:'OBSERVACIÓN', id:'SMS-2025-005', desc:'Fatiga visual piloto tras 4h operación', date:'12 Abr 2025 · En seguimiento' },
              ].map(ev => (
                <div key={ev.id} style={{background:`rgba(${ev.color==='#ef4444'?'239,68,68':ev.color==='#f59e0b'?'245,158,11':'34,197,94'},0.1)`,border:`1px solid rgba(${ev.color==='#ef4444'?'239,68,68':ev.color==='#f59e0b'?'245,158,11':'34,197,94'},0.2)`,borderRadius:'12px',padding:'12px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}}>
                    <span style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.08em',color:ev.color}}>{ev.label}</span>
                    <span style={{fontFamily:'monospace',fontSize:'10px',color:accent}}>{ev.id}</span>
                  </div>
                  <div style={{fontSize:'11px',fontWeight:700,color:'#fff'}}>{ev.desc}</div>
                  <div style={{fontSize:'10px',color:'#64748b',marginTop:'3px'}}>{ev.date}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DARK BAND */}
      <div style={{background:'#1A202C',color:'#fff',padding:'56px 32px',position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="dark" />
        <div className="grid grid-cols-2 sm:grid-cols-4" style={{maxWidth:'1100px',margin:'0 auto',gap:'32px',textAlign:'center'}}>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>3</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Tipos de clasificación</div></div>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>100%</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Trazabilidad de eventos</div></div>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>PDF</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Reportes para auditoría</div></div>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>RAC 100</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Cumplimiento normativo</div></div>
        </div>
      </div>

      {/* SPOTLIGHT */}
      <FeatureSpotlight
        overline="Seguridad operacional"
        title={<>Clasifica cada <span style={{color:'#ec5b13'}}>evento</span> de seguridad</>}
        desc="Registra incidentes, eventos graves y accidentes con su narrativa, acciones correctivas y seguimiento. El SMS queda documentado y listo para una auditoría de la AeroCivil."
        bullets={[
          'Clasificación por severidad: incidente, grave y accidente',
          'Narrativa, causas y acciones correctivas por evento',
          'Análisis de tendencias de riesgo de tu operación',
          'Reporte SMS exportable con tu código de formato',
        ]}
      >
        <SmsSafetyScene />
      </FeatureSpotlight>

      {/* FUNCIONES SMS */}
      <section style={{padding:'80px 32px',background:'#f8f6f6',position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="light" />
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'56px'}}>
            <div style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.3em',color:accent,marginBottom:'12px'}}>Módulo SMS</div>
            <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#1A202C'}}>Seguridad operacional <span style={{color:accent}}>documentada y trazable</span></h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{gap:'20px'}}>
            {[
              { icon:'report', title:'Clasificación de Eventos', desc:'Tres niveles según la RAC 100: Incidente, Incidente Grave y Accidente. Cada categoría tiene un flujo de documentación específico con campos obligatorios.' },
              { icon:'monitor_heart', title:'Narrativa Detallada', desc:'Descripción libre del evento con campos estructurados: aeronave involucrada, piloto, condiciones meteorológicas, fase de vuelo y descripción del evento.' },
              { icon:'fact_check', title:'Acciones Correctivas', desc:'Registro de acciones correctivas y preventivas con responsable asignado, fecha límite y estado de implementación. Cierre formal del evento documentado.' },
              { icon:'radar', title:'Análisis de Tendencias', desc:'Visualización de eventos por tipo, aeronave, piloto y período. Identifica patrones de riesgo antes de que se conviertan en incidentes graves.' },
              { icon:'verified_user', title:'Roles de Acceso', desc:'El Gerente SMS tiene acceso completo. Los pilotos reportan eventos. El administrador revisa y cierra. Flujo de aprobación configurable por organización.' },
              { icon:'analytics', title:'Reportes para Auditoría', desc:'Exporta el historial completo de eventos SMS en PDF o Excel. Con logo corporativo, código de formato y versión. Listo para inspecciones de la AeroCivil.' },
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
      <section style={{background:'#f8f6f6',padding:'80px 32px',position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="light" />
        <div style={{maxWidth:'760px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'48px'}}>
            <div style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.3em',color:accent,marginBottom:'12px'}}>SMS Aeronáutico — Preguntas</div>
            <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#1A202C'}}>Todo sobre el <span style={{color:accent}}>sistema de seguridad</span></h2>
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
      <div style={{background:'#1A202C',padding:'80px 32px',textAlign:'center',position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="dark" />
        <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#fff',marginBottom:'12px'}}>Tu SMS aeronáutico <span style={{color:accent}}>en regla</span> desde hoy</h2>
        <p style={{fontSize:'15px',color:'#94a3b8',maxWidth:'560px',margin:'0 auto 32px'}}>Documenta, clasifica y da seguimiento a todos los eventos de seguridad de tu operación UAS.</p>
        <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
          <Link href="/registro" style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'#fff',color:'#1A202C',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none'}}>
            <span className="material-symbols-outlined" style={{fontSize:'18px'}}>health_and_safety</span>Comenzar gratis
          </Link>
          <Link href="/operadores-uas" style={{display:'inline-flex',alignItems:'center',gap:'8px',border:'1.5px solid rgba(255,255,255,0.2)',color:'#fff',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none'}}>
            Ver para operadores UAS
          </Link>
        </div>
      </div>

      <SEOFooter brandDesc="SMS aeronáutico para operadores UAS en Colombia. Cumplimiento RAC 100 desde el primer vuelo." />
    </>
  );
}
