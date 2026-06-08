import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';

export const metadata = {
  title: 'Bitácora Digital de Vuelo para Drones RAC 100 en Colombia',
  description: 'Registra cada vuelo de drones con los campos exigidos por la AeroCivil. Bitácora digital RAC 100 formato F-OPS-002. Suma automática de horas, reportes PDF instantáneos. Prueba gratis.',
  keywords: ['bitácora digital drones', 'bitácora vuelo RAC 100', 'F-OPS-002', 'registro vuelos drones Colombia', 'bitácora UAS AeroCivil'],
  alternates: { canonical: '/bitacora-digital' },
  openGraph: {
    title: 'Bitácora Digital de Vuelo para Drones RAC 100 | Bitafly',
    description: 'Bitácora digital RAC 100. Genera el F-OPS-002 en PDF en segundos. Sin Excel, sin papel.',
    url: 'https://bitafly.com/bitacora-digital',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿Qué es la bitácora digital de vuelo para drones?", "acceptedAnswer": { "@type": "Answer", "text": "La bitácora digital de vuelo es el registro electrónico obligatorio según la RAC 100 de la AeroCivil colombiana. Documenta misión, aeronave, tripulación, batería, condiciones meteorológicas y tiempos de vuelo. Bitafly genera el formato oficial F-OPS-002 en PDF." } },
    { "@type": "Question", "name": "¿El formato F-OPS-002 de Bitafly es válido para la AeroCivil?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. El F-OPS-002 generado por Bitafly incluye todos los campos exigidos por la UAEAC: código de formato, versión, logo corporativo, misión, aeronave matriculada, tripulación certificada y firma del jefe de pilotos." } },
    { "@type": "Question", "name": "¿Cuántos vuelos puedo registrar en Bitafly?", "acceptedAnswer": { "@type": "Answer", "text": "La bitácora digital es ilimitada en todos los planes de Bitafly, incluyendo el plan gratuito." } },
    { "@type": "Question", "name": "¿Puedo registrar vuelos desde el celular en campo?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Bitafly es una app web responsive que funciona desde cualquier celular o tablet con conexión a internet. Tu tripulación abre el navegador, inicia sesión y registra el vuelo desde el sitio de operación sin necesidad de instalar nada." } },
  ],
};

const s = {
  badge: { display:'inline-flex',alignItems:'center',gap:'7px',background:'rgba(236,91,19,0.08)',border:'1px solid rgba(236,91,19,0.2)',borderRadius:'9999px',padding:'5px 14px',marginBottom:'20px' },
  dot: { width:'6px',height:'6px',borderRadius:'50%',background:'#ec5b13' },
  badgeText: { fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.15em',color:'#ec5b13' },
  h1: { fontSize:'clamp(36px,4vw,52px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',lineHeight:1.02,color:'#1A202C',marginBottom:'20px' },
  accent: { color:'#ec5b13' },
  desc: { fontSize:'16px',fontWeight:500,color:'#64748b',lineHeight:1.65,maxWidth:'480px',marginBottom:'28px' },
  btnPrimary: { display:'inline-flex',alignItems:'center',gap:'8px',background:'#ec5b13',color:'#fff',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none',boxShadow:'0 8px 24px rgba(236,91,19,0.3)' },
  btnGhost: { display:'inline-flex',alignItems:'center',gap:'8px',border:'1.5px solid #e2e8f0',color:'#475569',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none' },
  darkBand: { background:'#1A202C',color:'#fff',padding:'56px 32px' },
  darkBandInner: { maxWidth:'1100px',margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'32px',textAlign:'center' },
  statVal: { fontSize:'36px',fontWeight:900,color:'#ec5b13' },
  statLbl: { fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px' },
  overline: { fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.3em',color:'#ec5b13',marginBottom:'12px' },
  h2: { fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',lineHeight:1.05,color:'#1A202C',marginBottom:'16px' },
  cardsGrid: { display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'20px' },
  card: { background:'#fff',border:'1.5px solid #f1f5f9',borderRadius:'28px',padding:'28px' },
  cardIcon: { width:'48px',height:'48px',background:'rgba(236,91,19,0.08)',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',color:'#ec5b13',marginBottom:'16px' },
  cardTitle: { fontSize:'13px',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.01em',color:'#1A202C',marginBottom:'8px' },
  cardDesc: { fontSize:'13px',color:'#64748b',lineHeight:1.6 },
  chip: { display:'inline-block',fontFamily:'monospace',fontSize:'11px',fontWeight:700,color:'#ec5b13',background:'rgba(236,91,19,0.06)',padding:'3px 8px',borderRadius:'6px' },
  faqSection: { background:'#f8f6f6',padding:'80px 32px' },
  faqInner: { maxWidth:'760px',margin:'0 auto' },
  btnWhite: { display:'inline-flex',alignItems:'center',gap:'8px',background:'#fff',color:'#1A202C',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none' },
  btnOutlineWhite: { display:'inline-flex',alignItems:'center',gap:'8px',border:'1.5px solid rgba(255,255,255,0.2)',color:'#fff',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none' },
};

export default function BitacoraDigitalPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SEONav />

      {/* HERO */}
      <section style={{padding:'80px 32px 72px',background:'#fff'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'56px',alignItems:'center'}}>
          <div>
            <div style={s.badge}><div style={s.dot}/><span style={s.badgeText}>Formato F-OPS-002 · UAEAC</span></div>
            <h1 style={s.h1}>Bitácora Digital de Vuelo para <span style={s.accent}>Drones RAC 100</span></h1>
            <p style={s.desc}>Registra cada operación UAS con los campos exigidos por la AeroCivil. Genera el Maestro de Vuelo F-OPS-002 en PDF en segundos. Sin Excel, sin papel.</p>
            <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
              <Link href="/registro" style={s.btnPrimary}><span className="material-symbols-outlined" style={{fontSize:'18px'}}>flight_takeoff</span>Registrar mi primer vuelo</Link>
              <Link href="/rac-100" style={s.btnGhost}>Ver cumplimiento RAC 100</Link>
            </div>
            <p style={{fontSize:'11px',fontWeight:700,color:'#94a3b8',marginTop:'14px'}}>Bitácora ilimitada en todos los planes · Sin tarjeta de crédito</p>
          </div>
          {/* Bitácora visual */}
          <div style={{background:'#f8fafc',border:'1.5px solid #e2e8f0',borderRadius:'24px',overflow:'hidden'}}>
            <div style={{background:'#1A202C',padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:'11px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',color:'#fff'}}>Bitácora de Vuelo</div>
              <span style={s.chip}>F-OPS-002</span>
            </div>
            <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:'10px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                <div style={{background:'#fff',border:'1px solid #f1f5f9',borderRadius:'10px',padding:'10px'}}><div style={{fontSize:'8px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',color:'#94a3b8'}}>Misión ID</div><div style={{fontSize:'11px',fontWeight:700,color:'#ec5b13',fontFamily:'monospace',marginTop:'3px'}}>OPS-2025-0142</div></div>
                <div style={{background:'#fff',border:'1px solid #f1f5f9',borderRadius:'10px',padding:'10px'}}><div style={{fontSize:'8px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',color:'#94a3b8'}}>Fecha</div><div style={{fontSize:'11px',fontWeight:700,color:'#1A202C',marginTop:'3px'}}>28 Abr 2025</div></div>
              </div>
              <div style={{background:'#fff',border:'1px solid #f1f5f9',borderRadius:'10px',padding:'10px'}}>
                <div style={{fontSize:'8px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',color:'#94a3b8',marginBottom:'6px'}}>Aeronave</div>
                <div style={{fontSize:'12px',fontWeight:900,textTransform:'uppercase',color:'#1A202C'}}>DJI Matrice 350 RTK</div>
                <div style={{fontSize:'10px',fontWeight:500,fontFamily:'monospace',color:'#94a3b8',marginTop:'2px'}}>MAT350-CO-0041</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px'}}>
                <div style={{background:'#fff',border:'1px solid #f1f5f9',borderRadius:'10px',padding:'10px',textAlign:'center'}}><div style={{fontSize:'8px',fontWeight:900,textTransform:'uppercase',color:'#94a3b8'}}>Despegue</div><div style={{fontSize:'14px',fontWeight:900,color:'#ec5b13',marginTop:'3px'}}>07:15</div></div>
                <div style={{background:'#fff',border:'1px solid #f1f5f9',borderRadius:'10px',padding:'10px',textAlign:'center'}}><div style={{fontSize:'8px',fontWeight:900,textTransform:'uppercase',color:'#94a3b8'}}>Aterrizaje</div><div style={{fontSize:'14px',fontWeight:900,color:'#1A202C',marginTop:'3px'}}>09:42</div></div>
                <div style={{background:'rgba(236,91,19,0.08)',border:'1px solid rgba(236,91,19,0.2)',borderRadius:'10px',padding:'10px',textAlign:'center'}}><div style={{fontSize:'8px',fontWeight:900,textTransform:'uppercase',color:'#94a3b8'}}>Total</div><div style={{fontSize:'14px',fontWeight:900,color:'#ec5b13',marginTop:'3px'}}>2.5h</div></div>
              </div>
              <div style={{background:'#1A202C',borderRadius:'10px',padding:'10px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',color:'#64748b'}}>Exportar PDF</span>
                <span className="material-symbols-outlined" style={{fontSize:'18px',color:'#ec5b13'}}>picture_as_pdf</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DARK BAND */}
      <div style={s.darkBand}>
        <div style={s.darkBandInner}>
          <div><div style={s.statVal}>∞</div><div style={s.statLbl}>Vuelos registrables</div></div>
          <div><div style={s.statVal}>F-OPS-002</div><div style={s.statLbl}>Formato oficial</div></div>
          <div><div style={s.statVal}>PDF</div><div style={s.statLbl}>Exportación instantánea</div></div>
          <div><div style={s.statVal}>0</div><div style={s.statLbl}>Datos en papel</div></div>
        </div>
      </div>

      {/* CAMPOS */}
      <section style={{padding:'80px 32px',background:'#f8f6f6'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'56px'}}>
            <div style={s.overline}>Campos del registro</div>
            <h2 style={s.h2}>Todo lo que exige la <span style={s.accent}>AeroCivil</span> en un solo formulario</h2>
          </div>
          <div style={s.cardsGrid}>
            {[
              { icon:'precision_manufacturing', title:'Aeronave y Matrícula', desc:'Selección de aeronave registrada con modelo, número de serie y matrícula UAEAC. Vinculación automática a horas totales acumuladas.' },
              { icon:'person', title:'Tripulación y PIC', desc:'Asignación del Piloto en Comando (PIC) con verificación de certificado vigente. Validación automática del médico aeronáutico antes del vuelo.' },
              { icon:'battery_charging_full', title:'Batería Utilizada', desc:'Registro de batería con número de serie, ciclos acumulados y estado. Alerta automática si la batería supera el umbral de ciclos configurado.' },
              { icon:'flight_takeoff', title:'Tiempos de Vuelo', desc:'Hora de despegue y aterrizaje con cálculo automático del tiempo total. Suma acumulada a las horas totales de la aeronave y del piloto.' },
              { icon:'cloud_done', title:'Condiciones Meteorológicas', desc:'Registro de condiciones del clima, visibilidad y viento en el momento de la operación. Campo obligatorio para el reporte oficial F-OPS-002.' },
              { icon:'timer', title:'Horas Acumuladas Automáticas', desc:'Cada vuelo registrado suma automáticamente las horas al totalizador de la aeronave y al libro de vuelo del piloto. Sin cálculos manuales.' },
            ].map(item => (
              <article key={item.icon} style={s.card}>
                <div style={s.cardIcon}><span className="material-symbols-outlined">{item.icon}</span></div>
                <h3 style={s.cardTitle}>{item.title}</h3>
                <p style={s.cardDesc}>{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={s.faqSection}>
        <div style={s.faqInner}>
          <div style={{textAlign:'center',marginBottom:'48px'}}>
            <div style={s.overline}>Bitácora digital — Preguntas</div>
            <h2 style={s.h2}>Todo sobre el <span style={s.accent}>F-OPS-002</span></h2>
          </div>
          {faqSchema.mainEntity.map((item, i) => (
            <details key={i} style={{background:'#fff',border:'1.5px solid #f1f5f9',borderRadius:'18px',overflow:'hidden',marginBottom:'10px'}}>
              <summary style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px',cursor:'pointer',listStyle:'none',fontSize:'14px',fontWeight:900,color:'#1A202C'}}>
                {item.name}
                <span className="material-symbols-outlined" style={{fontSize:'20px',color:'#ec5b13',flexShrink:0}}>expand_more</span>
              </summary>
              <p style={{padding:'0 22px 18px',fontSize:'13px',color:'#64748b',lineHeight:1.7}}>{item.acceptedAnswer.text}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div style={{background:'#1A202C',padding:'80px 32px',textAlign:'center'}}>
        <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#fff',marginBottom:'12px'}}>Tu primera bitácora en <span style={s.accent}>menos de 5 minutos</span></h2>
        <p style={{fontSize:'15px',color:'#94a3b8',maxWidth:'560px',margin:'0 auto 32px'}}>Configura tu organización, agrega tu dron y registra el primer vuelo. Sin papel, sin Excel.</p>
        <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
          <Link href="/registro" style={s.btnWhite}><span className="material-symbols-outlined" style={{fontSize:'18px'}}>flight_takeoff</span>Comenzar gratis</Link>
          <Link href="/rac-100" style={s.btnOutlineWhite}>Ver cumplimiento RAC 100</Link>
        </div>
      </div>

      <SEOFooter brandDesc="Bitácora digital RAC 100 para operadores UAS en Colombia. Formato F-OPS-002 oficial." />
    </>
  );
}
