import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';
import Decor from '@/components/landing/Decor';
import FeatureSpotlight from '@/components/landing/FeatureSpotlight';
import { BatteryMaintScene } from '@/components/landing/Illustrations';

export const metadata = {
  title: 'Software de Mantenimiento de Drones y Baterías LiPo',
  description: 'Controla el mantenimiento de tus drones y baterías LiPo con alertas automáticas a 200 horas o 6 meses. Genera el Registro de Baterías que exige la RAC 100, con tu propio código de formato (F-MNT-003 por defecto). Prueba gratis.',
  keywords: ['mantenimiento drones Colombia', 'baterías LiPo drones', 'F-MNT-003', 'mantenimiento UAS AeroCivil', 'software mantenimiento aeronaves drones'],
  alternates: { canonical: '/mantenimiento-drones' },
  openGraph: {
    title: 'Software de Mantenimiento de Drones y Baterías LiPo | Bitafly',
    description: 'Alertas automáticas a 200h o 6 meses. Control de ciclos LiPo. F-MNT-003 en PDF.',
    url: 'https://bitafly.com/mantenimiento-drones',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿Cada cuánto se debe hacer mantenimiento a un dron según la RAC 100?", "acceptedAnswer": { "@type": "Answer", "text": "Según la RAC 100 de la AeroCivil, los drones deben recibir mantenimiento preventivo al alcanzar 200 horas de vuelo acumuladas o cada 6 meses calendario, lo que ocurra primero. Bitafly envía alertas automáticas antes de llegar a estos umbrales." } },
    { "@type": "Question", "name": "¿Qué es el formato F-MNT-003?", "acceptedAnswer": { "@type": "Answer", "text": "F-MNT-003 es el código con el que Bitafly identifica por defecto el Registro de Baterías. No es un formato oficial de la AeroCivil: la RAC 100 exige llevar el registro, pero cada operador define su propia nomenclatura en su manual de operaciones. Documenta el número de serie de cada batería, los ciclos acumulados, el estado (operativa, inflada, retirada) y cada intervención. Bitafly lo genera en PDF con el código que tú definas." } },
    { "@type": "Question", "name": "¿Cuántos ciclos aguanta una batería LiPo de dron?", "acceptedAnswer": { "@type": "Answer", "text": "La mayoría de fabricantes recomienda retirar las baterías LiPo entre 150 y 300 ciclos de carga/descarga. Bitafly permite configurar el umbral por batería (200 ciclos por defecto) y alerta automáticamente cuando se acerca al límite." } },
    { "@type": "Question", "name": "¿Puedo configurar el umbral de ciclos por batería?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Aunque el valor por defecto es 200 ciclos, puedes configurar el umbral individualmente por batería según las recomendaciones del fabricante o los criterios de seguridad de tu organización." } },
  ],
};

const accent = '#ec5b13';

export default function MantenimientoDronesPage() {
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
              <span style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.15em',color:accent}}>F-MNT-003 · Alertas automáticas</span>
            </div>
            <h1 style={{fontSize:'clamp(36px,4vw,52px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',lineHeight:1.02,color:'#1A202C',marginBottom:'20px'}}>
              Software de <span style={{color:accent}}>Mantenimiento de Drones</span> y Baterías LiPo
            </h1>
            <p style={{fontSize:'16px',fontWeight:500,color:'#64748b',lineHeight:1.65,maxWidth:'480px',marginBottom:'28px'}}>
              Alertas automáticas a 200 horas de vuelo o 6 meses. Control de ciclos de baterías LiPo. Historial completo de intervenciones. Registro de Baterías en PDF con tu propio código de formato (F-MNT-003 por defecto).
            </p>
            <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
              <Link href="/registro" style={{display:'inline-flex',alignItems:'center',gap:'8px',background:accent,color:'#fff',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none',boxShadow:'0 8px 24px rgba(236,91,19,0.3)'}}>
                <span className="material-symbols-outlined" style={{fontSize:'18px'}}>build</span>Comenzar gratis
              </Link>
              <Link href="/gestion-flota-drones" style={{display:'inline-flex',alignItems:'center',gap:'8px',border:'1.5px solid #e2e8f0',color:'#475569',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none'}}>
                Ver gestión de flota
              </Link>
            </div>
            <p style={{fontSize:'11px',fontWeight:700,color:'#94a3b8',marginTop:'14px'}}>Sin tarjeta de crédito · Alertas ilimitadas · Soporte en español</p>
          </div>
          {/* Maintenance visual */}
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={{background:'#fffbeb',border:'1.5px solid #fde68a',borderRadius:'20px',padding:'18px',display:'flex',gap:'14px',alignItems:'flex-start'}}>
              <span className="material-symbols-outlined" style={{color:'#d97706',fontSize:'24px',flexShrink:0}}>warning</span>
              <div>
                <div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',color:'#d97706'}}>MANTENIMIENTO PRÓXIMO</div>
                <div style={{fontSize:'13px',fontWeight:900,color:'#1A202C',marginTop:'3px'}}>DJI Phantom 4 RTK</div>
                <div style={{fontSize:'11px',color:'#64748b',marginTop:'2px'}}>198h / 200h — Revisión en 2 horas de vuelo</div>
              </div>
            </div>
            <div style={{background:'#fff',border:'1.5px solid #f1f5f9',borderRadius:'20px',padding:'18px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                <div style={{fontSize:'11px',fontWeight:900,textTransform:'uppercase',color:'#1A202C'}}>Baterías LiPo</div>
                <span style={{fontFamily:'monospace',fontSize:'11px',fontWeight:700,color:accent,background:'rgba(236,91,19,0.06)',padding:'3px 8px',borderRadius:'6px'}}>F-MNT-003</span>
              </div>
              {[
                { id:'BAT-001', label:'LiPo 6S', pct:'62%', color:'#22c55e', val:'124/200' },
                { id:'BAT-002', label:'LiPo 6S', pct:'91%', color:'#f59e0b', val:'183/200' },
                { id:'BAT-003', label:'LiPo 4S', pct:'100%', color:'#ef4444', val:'204/200 ⚠' },
              ].map(bat => (
                <div key={bat.id} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
                  <span className="material-symbols-outlined" style={{color:bat.color,fontSize:'18px'}}>battery_charging_full</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'11px',fontWeight:700,color:'#1A202C'}}>{bat.id} · {bat.label}</div>
                    <div style={{height:'5px',background:'#f1f5f9',borderRadius:'3px',marginTop:'4px'}}>
                      <div style={{width:bat.pct,height:'100%',background:bat.color,borderRadius:'3px'}}/>
                    </div>
                  </div>
                  <span style={{fontSize:'10px',fontWeight:900,color:bat.color}}>{bat.val}</span>
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
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>200h</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Umbral mantenimiento</div></div>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>200</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Ciclos batería por defecto</div></div>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>F-MNT-003</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Código por defecto</div></div>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>∞</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Baterías registrables</div></div>
        </div>
      </div>

      {/* SPOTLIGHT */}
      <FeatureSpotlight
        flip
        overline="Ciclos y alertas"
        title={<>Mantenimiento <span style={{color:'#ec5b13'}}>predictivo</span> sin hojas de cálculo</>}
        desc="Bitafly cuenta los ciclos de cada batería LiPo y las horas de cada aeronave por ti. Cuando se acerca un umbral, dispara la alerta antes de que sea un problema en operación."
        bullets={[
          'Conteo de ciclos por batería con umbral configurable',
          'Alerta automática a 200 h o 6 meses desde la última intervención',
          'Detección y registro de inflamiento de baterías',
          'Trazabilidad de cada cambio de hélice, calibración y reparación',
        ]}
      >
        <BatteryMaintScene />
      </FeatureSpotlight>

      {/* FUNCIONES */}
      <section style={{padding:'80px 32px',background:'#f8f6f6',position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="light" />
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'56px'}}>
            <div style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.3em',color:accent,marginBottom:'12px'}}>Control técnico</div>
            <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',lineHeight:1.05,color:'#1A202C',marginBottom:'16px'}}>
              Todo el mantenimiento de tu flota <span style={{color:accent}}>bajo control</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{gap:'20px'}}>
            {[
              { icon:'timer', title:'Alertas por Horas de Vuelo', desc:'Alerta automática cuando la aeronave alcanza 200 horas de vuelo acumuladas. Umbral configurable según las recomendaciones del fabricante.' },
              { icon:'sync', title:'Alertas por Calendario', desc:'Recordatorio automático cada 6 meses calendario desde la última intervención técnica, independiente de las horas de vuelo acumuladas.' },
              { icon:'battery_charging_full', title:'Control de Ciclos LiPo', desc:'Registro de ciclos por batería con umbral configurable. Detecta inflamiento, registra eventos anómalos y previene fallos en operación crítica.' },
              { icon:'engineering', title:'Historial de Intervenciones', desc:'Trazabilidad completa de cada cambio de hélice, calibración de sensores, revisión de motores y reparación. Con fecha, técnico responsable y horas al momento.' },
              { icon:'notification_important', title:'Bloqueo Preventivo', desc:'Opción de bloquear el registro de nuevos vuelos en aeronaves con mantenimiento vencido, evitando operaciones fuera de cumplimiento.' },
              { icon:'trending_up', title:'Reporte F-MNT-003 en PDF', desc:'Exporta el Registro de Baterías con número de serie, ciclos, estado de cada batería e historial de intervenciones, usando tu propio código de formato. Listo para auditorías.' },
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
            <div style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.3em',color:accent,marginBottom:'12px'}}>Mantenimiento — Preguntas</div>
            <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#1A202C'}}>Todo sobre el <span style={{color:accent}}>F-MNT-003</span></h2>
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
        <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#fff',marginBottom:'12px'}}>Nunca más una aeronave fuera de <span style={{color:accent}}>cumplimiento</span></h2>
        <p style={{fontSize:'15px',color:'#94a3b8',maxWidth:'560px',margin:'0 auto 32px'}}>Alertas automáticas, historial trazable y reportes PDF para la AeroCivil.</p>
        <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
          <Link href="/registro" style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'#fff',color:'#1A202C',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none'}}>
            <span className="material-symbols-outlined" style={{fontSize:'18px'}}>build</span>Comenzar gratis
          </Link>
          <Link href="/gestion-flota-drones" style={{display:'inline-flex',alignItems:'center',gap:'8px',border:'1.5px solid rgba(255,255,255,0.2)',color:'#fff',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none'}}>
            Ver gestión de flota
          </Link>
        </div>
      </div>

      <SEOFooter brandDesc="Mantenimiento de drones y baterías LiPo con cumplimiento RAC 100. Formato F-MNT-003 configurable." />
    </>
  );
}
