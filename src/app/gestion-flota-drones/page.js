import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';
import Decor from '@/components/landing/Decor';
import FeatureSpotlight from '@/components/landing/FeatureSpotlight';
import { FleetScene } from '@/components/landing/Illustrations';

export const metadata = {
  title: 'Gestión de Flota de Drones para Empresas en Colombia',
  description: 'Software de gestión de flota de drones para empresas en Colombia. Registra aeronaves, controla horas de vuelo, monitorea estado y cumple la RAC 100 de la AeroCivil. Prueba gratis.',
  keywords: ['gestión flota drones Colombia', 'software flota UAS', 'control drones empresa', 'administración aeronaves Colombia', 'flota drones RAC 100'],
  alternates: { canonical: '/gestion-flota-drones' },
  openGraph: {
    title: 'Gestión de Flota de Drones para Empresas en Colombia | Bitafly',
    description: 'Registra aeronaves, controla horas, monitorea estado. Hasta 15 aeronaves en el plan Flota.',
    url: 'https://bitafly.com/gestion-flota-drones',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿Cuántos drones puedo gestionar con Bitafly?", "acceptedAnswer": { "@type": "Answer", "text": "Bitafly escala desde 1 aeronave en el plan gratuito hasta flotas ilimitadas en el plan Enterprise. El plan Flota (el más popular) soporta hasta 15 aeronaves." } },
    { "@type": "Question", "name": "¿Qué información puedo registrar por cada aeronave?", "acceptedAnswer": { "@type": "Answer", "text": "Por cada aeronave puedes registrar: modelo, fabricante, número de serie, matrícula UAEAC, fecha de adquisición, horas totales acumuladas, estado (operativo, mantenimiento, inactivo), historial de mantenimientos e intervenciones técnicas." } },
    { "@type": "Question", "name": "¿Cómo sé en tiempo real cuántas horas tiene cada dron?", "acceptedAnswer": { "@type": "Answer", "text": "Bitafly suma automáticamente las horas de cada vuelo registrado en la bitácora al totalizador de la aeronave. El panel de flota muestra las horas totales en tiempo real y el porcentaje de aproximación al próximo mantenimiento." } },
    { "@type": "Question", "name": "¿Puedo gestionar drones de diferentes marcas en la misma plataforma?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Bitafly es agnóstico de marca. Puedes registrar DJI, Autel, Parrot, Wingtra o cualquier otro fabricante. El sistema gestiona el registro independientemente del fabricante, siempre que la aeronave tenga matrícula UAEAC." } },
  ],
};

const accent = '#ec5b13';

export default function GestionFlotaDronesPage() {
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
              <span style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.15em',color:accent}}>Flota · Aeronaves · Tripulación</span>
            </div>
            <h1 style={{fontSize:'clamp(36px,4vw,52px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',lineHeight:1.02,color:'#1A202C',marginBottom:'20px'}}>
              Gestión de <span style={{color:accent}}>Flota de Drones</span> para Empresas en Colombia
            </h1>
            <p style={{fontSize:'16px',fontWeight:500,color:'#64748b',lineHeight:1.65,maxWidth:'480px',marginBottom:'28px'}}>
              Registra cada aeronave, controla horas de vuelo acumuladas, monitorea el estado operativo y gestiona la tripulación asignada. Todo en una plataforma RAC 100.
            </p>
            <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
              <Link href="/registro" style={{display:'inline-flex',alignItems:'center',gap:'8px',background:accent,color:'#fff',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none',boxShadow:'0 8px 24px rgba(236,91,19,0.3)'}}>
                <span className="material-symbols-outlined" style={{fontSize:'18px'}}>precision_manufacturing</span>Comenzar gratis
              </Link>
              <Link href="/mantenimiento-drones" style={{display:'inline-flex',alignItems:'center',gap:'8px',border:'1.5px solid #e2e8f0',color:'#475569',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none'}}>
                Ver mantenimiento
              </Link>
            </div>
            <p style={{fontSize:'11px',fontWeight:700,color:'#94a3b8',marginTop:'14px'}}>Hasta 15 aeronaves en el plan Flota · Ilimitadas en Enterprise</p>
          </div>
          {/* Fleet grid mockup */}
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{gap:'10px'}}>
            {[
              { name:'DJI M350 RTK', serial:'MAT350-CO-0041', hours:'89.5h', status:'Operativo', statusColor:'#22c55e', statusBg:'#f0fdf4', statusBorder:'#bbf7d0', hoursColor:accent },
              { name:'Autel EVO II', serial:'AUT-EVO-0008', hours:'198.2h', status:'Mant.', statusColor:'#d97706', statusBg:'#fffbeb', statusBorder:'#fde68a', hoursColor:'#d97706' },
              { name:'DJI Mavic 3E', serial:'MAV3E-CO-0021', hours:'67.1h', status:'Operativo', statusColor:'#22c55e', statusBg:'#f0fdf4', statusBorder:'#bbf7d0', hoursColor:accent },
            ].map(ac => (
              <div key={ac.serial} style={{background:'#fff',border:'1.5px solid #f1f5f9',borderRadius:'20px',padding:'16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
                  <div style={{width:'36px',height:'36px',background:'rgba(236,91,19,0.08)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <span className="material-symbols-outlined" style={{fontSize:'18px',color:accent}}>precision_manufacturing</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'4px',background:ac.statusBg,border:`1px solid ${ac.statusBorder}`,borderRadius:'9999px',padding:'3px 8px'}}>
                    <div style={{width:'5px',height:'5px',borderRadius:'50%',background:ac.statusColor}}/>
                    <span style={{fontSize:'8px',fontWeight:900,color:ac.statusColor,textTransform:'uppercase'}}>{ac.status}</span>
                  </div>
                </div>
                <div style={{fontSize:'11px',fontWeight:900,textTransform:'uppercase',color:'#1A202C'}}>{ac.name}</div>
                <div style={{fontSize:'9px',color:'#94a3b8',fontFamily:'monospace',marginTop:'2px'}}>{ac.serial}</div>
                <div style={{fontSize:'20px',fontWeight:900,color:ac.hoursColor,marginTop:'8px'}}>{ac.hours}</div>
              </div>
            ))}
            <div style={{background:'#1A202C',borderRadius:'20px',padding:'16px',display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',gap:'6px',border:'1.5px dashed rgba(255,255,255,0.1)'}}>
              <span className="material-symbols-outlined" style={{fontSize:'28px',color:accent}}>add_circle</span>
              <div style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.08em',color:'#64748b'}}>Agregar Aeronave</div>
            </div>
          </div>
        </div>
      </section>

      {/* DARK BAND */}
      <div style={{background:'#1A202C',color:'#fff',padding:'56px 32px',position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="dark" />
        <div className="grid grid-cols-2 sm:grid-cols-4" style={{maxWidth:'1100px',margin:'0 auto',gap:'32px',textAlign:'center'}}>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>15</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Aeronaves plan Flota</div></div>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>∞</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Aeronaves Enterprise</div></div>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>5</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Estados de aeronave</div></div>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>24/7</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Acceso en la nube</div></div>
        </div>
      </div>

      {/* SPOTLIGHT */}
      <FeatureSpotlight
        overline="Visión de flota"
        title={<>Toda tu <span style={{color:'#ec5b13'}}>flota</span> en un solo panel</>}
        desc="Cada aeronave con sus horas totales, ciclos de batería, estado operativo y próximos mantenimientos. Sin hojas de cálculo dispersas: el panel se actualiza solo al registrar cada vuelo."
        bullets={[
          'Horas totales por aeronave actualizadas automáticamente',
          'Alertas de mantenimiento a 200 h o 6 meses',
          'Estado en tiempo real: operativa, en revisión o de baja',
          'Límites de flota por plan, sin sorpresas',
        ]}
      >
        <FleetScene />
      </FeatureSpotlight>

      {/* FUNCIONES */}
      <section style={{padding:'80px 32px',background:'#f8f6f6'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'56px'}}>
            <div style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.3em',color:accent,marginBottom:'12px'}}>Módulo de flota</div>
            <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#1A202C'}}>Control total de <span style={{color:accent}}>cada aeronave</span></h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{gap:'20px'}}>
            {[
              { icon:'pin', title:'Registro de Aeronaves', desc:'Modelo, fabricante, número de serie, matrícula UAEAC, fecha de adquisición y foto. Perfil completo de cada aeronave de la flota.' },
              { icon:'trending_up', title:'Horas Totales en Tiempo Real', desc:'Cada vuelo registrado suma automáticamente al totalizador de la aeronave. Visualiza las horas en el panel de flota sin cálculos manuales.' },
              { icon:'build', title:'Estado de Mantenimiento', desc:'Indicador visual del estado: Operativa, En Mantenimiento, Inactiva. Alerta cuando se acerca a 200 horas o 6 meses del último servicio.' },
              { icon:'battery_charging_full', title:'Baterías Asignadas', desc:'Gestión de las baterías LiPo asociadas a cada aeronave con control de ciclos individual. Registro automático en cada vuelo.' },
              { icon:'group', title:'Tripulación Certificada', desc:'Asignación de pilotos habilitados por aeronave. Verificación automática de certificados vigentes antes de permitir el registro de un vuelo.' },
              { icon:'analytics', title:'Análisis de Utilización', desc:'Reportes de horas voladas por aeronave en el período seleccionado. Identifica aeronaves subutilizadas o sobrecargadas de operación.' },
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
            <div style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.3em',color:accent,marginBottom:'12px'}}>Gestión de flota — Preguntas</div>
            <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#1A202C'}}>Todo sobre <span style={{color:accent}}>Mi Flota</span></h2>
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
        <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#fff',marginBottom:'12px'}}>Tu flota de drones <span style={{color:accent}}>organizada y en regla</span></h2>
        <p style={{fontSize:'15px',color:'#94a3b8',maxWidth:'560px',margin:'0 auto 32px'}}>Control de horas, mantenimiento, tripulación y documentación RAC 100 en una sola plataforma.</p>
        <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
          <Link href="/registro" style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'#fff',color:'#1A202C',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none'}}>
            <span className="material-symbols-outlined" style={{fontSize:'18px'}}>precision_manufacturing</span>Comenzar gratis
          </Link>
          <Link href="/precios" style={{display:'inline-flex',alignItems:'center',gap:'8px',border:'1.5px solid rgba(255,255,255,0.2)',color:'#fff',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none'}}>
            Ver planes y precios
          </Link>
        </div>
      </div>

      <SEOFooter brandDesc="Gestión de flota de drones para empresas en Colombia con cumplimiento RAC 100." />
    </>
  );
}
