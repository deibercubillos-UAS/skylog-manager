import Link from 'next/link';
import Image from 'next/image';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';
import SEOBreadcrumb from '@/components/seo/SEOBreadcrumb';
import SocialProofStrip from '@/components/seo/SocialProofStrip';
import Decor from '@/components/landing/Decor';
import FeatureSpotlight from '@/components/landing/FeatureSpotlight';
import { WeatherScene } from '@/components/landing/Illustrations';

export const metadata = {
  title: 'Clima y Meteorología para Drones — Verificación Pre-Vuelo | Bitafly',
  description: 'Verifica las condiciones meteorológicas antes de cada vuelo de dron en Colombia: viento, ráfagas, visibilidad, lluvia e índice Kp para la fiabilidad del GPS. Score de aptitud 0-100 integrado en la programación, el despacho y el replay. Gratis con Bitafly.',
  keywords: ['clima para drones', 'meteorología drones Colombia', 'condiciones de vuelo drones', 'viento drones', 'índice Kp GPS drones', 'pronóstico vuelo UAS', 'clima UAV', 'alternativa UAV Forecast'],
  alternates: { canonical: '/clima-drones' },
  openGraph: {
    title: 'Clima y Meteorología para Drones — Verificación Pre-Vuelo | Bitafly',
    description: 'Score de aptitud de vuelo 0-100 con viento, ráfagas, visibilidad, lluvia y Kp/GPS. Integrado en tu operación, no una app aparte.',
    url: 'https://bitafly.com/clima-drones',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿Qué condiciones meteorológicas verifica Bitafly antes de un vuelo?", "acceptedAnswer": { "@type": "Answer", "text": "Bitafly evalúa viento a 10 m, ráfagas, visibilidad, precipitación y probabilidad de lluvia, además del índice Kp de actividad geomagnética que afecta la fiabilidad del GPS. Con esas variables calcula un score de aptitud de vuelo de 0 a 100 y un semáforo APTO / NO APTO." } },
    { "@type": "Question", "name": "¿Qué es el índice Kp y por qué importa para volar un dron?", "acceptedAnswer": { "@type": "Answer", "text": "El índice Kp (de la NOAA) mide la actividad geomagnética del Sol. Cuando es alto, la señal GPS se degrada y el dron puede perder precisión de posicionamiento. Bitafly muestra el Kp actual y clasifica el GPS como óptimo, degradado o no confiable para que decidas con criterio." } },
    { "@type": "Question", "name": "¿Cómo se calcula el score de aptitud de vuelo?", "acceptedAnswer": { "@type": "Answer", "text": "El score combina viento (30%), ráfagas (22%), visibilidad (22%), precipitación (16%), probabilidad de lluvia (5%) e índice Kp (5%). Los umbrales por defecto siguen criterios de operación UAS (viento 25 km/h, ráfagas 35 km/h, visibilidad 5 km). La nubosidad se excluye a propósito porque la resolución del modelo la hace poco confiable para un punto específico." } },
    { "@type": "Question", "name": "¿De dónde salen los datos del clima?", "acceptedAnswer": { "@type": "Answer", "text": "Las variables meteorológicas provienen de Open-Meteo y el índice Kp de la NOAA (SWPC). Son fuentes abiertas, sin costo ni API key para el operador, actualizadas automáticamente y con zona horaria de Colombia (America/Bogotá)." } },
    { "@type": "Question", "name": "¿Dónde aparece el clima dentro de Bitafly?", "acceptedAnswer": { "@type": "Answer", "text": "El clima está integrado en el flujo operacional: al programar la misión (al elegir el municipio se geocodifica el punto), al despachar el vuelo (badge APTO / NO APTO) y en el replay del vuelo (condiciones al momento de la operación). No es una app aparte: queda dentro de la misma plataforma que gestiona tu bitácora y tu cumplimiento RAC 100." } },
    { "@type": "Question", "name": "¿Puedo ver el clima histórico de un vuelo ya realizado?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Bitafly consulta el archivo histórico de Open-Meteo y muestra las condiciones exactas (viento, visibilidad, lluvia, Kp) al momento del vuelo en el replay, útil para análisis post-operación e investigación de eventos de seguridad." } },
  ],
};

const accent = '#ec5b13';
const green = '#22c55e';

const s = {
  badge: { display:'inline-flex',alignItems:'center',gap:'7px',background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.25)',borderRadius:'9999px',padding:'5px 14px',marginBottom:'20px' },
  dot: { width:'6px',height:'6px',borderRadius:'50%',background:green },
  badgeText: { fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.15em',color:'#16a34a' },
  h1: { fontSize:'clamp(36px,4vw,52px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',lineHeight:1.02,color:'#1A202C',marginBottom:'20px' },
  accent: { color:accent },
  desc: { fontSize:'16px',fontWeight:500,color:'#64748b',lineHeight:1.65,maxWidth:'480px',marginBottom:'28px' },
  btnPrimary: { display:'inline-flex',alignItems:'center',gap:'8px',background:accent,color:'#fff',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none',boxShadow:'0 8px 24px rgba(236,91,19,0.3)' },
  btnGhost: { display:'inline-flex',alignItems:'center',gap:'8px',border:'1.5px solid #e2e8f0',color:'#475569',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none' },
  darkBand: { background:'#1A202C',color:'#fff',padding:'56px 32px' },
  statVal: { fontSize:'34px',fontWeight:900,color:accent },
  statLbl: { fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.18em',color:'#64748b',marginTop:'6px' },
  overline: { fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.3em',color:accent,marginBottom:'12px' },
  h2: { fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',lineHeight:1.05,color:'#1A202C',marginBottom:'16px' },
  sectionDesc: { fontSize:'15px',fontWeight:500,color:'#64748b',lineHeight:1.65,maxWidth:'620px',margin:'0 auto 48px' },
  card: { background:'#fff',border:'1.5px solid #f1f5f9',borderRadius:'28px',padding:'28px' },
  cardIcon: { width:'48px',height:'48px',background:'rgba(236,91,19,0.08)',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',color:accent,marginBottom:'16px' },
  cardTitle: { fontSize:'13px',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.01em',color:'#1A202C',marginBottom:'8px' },
  cardDesc: { fontSize:'13px',color:'#64748b',lineHeight:1.6 },
  faqSection: { background:'#f8f6f6',padding:'80px 32px' },
  ctaBand: { background:'#1A202C',padding:'80px 32px',textAlign:'center' },
  btnWhite: { display:'inline-flex',alignItems:'center',gap:'8px',background:'#fff',color:'#1A202C',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none' },
  btnOutlineWhite: { display:'inline-flex',alignItems:'center',gap:'8px',border:'1.5px solid rgba(255,255,255,0.2)',color:'#fff',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none' },
};

const MEASURES = [
  { icon:'air', title:'Viento a 10 m', desc:'Velocidad del viento en superficie. Umbral por defecto de 25 km/h; por encima, el vuelo se marca como no apto.' },
  { icon:'mode_fan', title:'Ráfagas', desc:'Las ráfagas, no el viento medio, son las que desestabilizan al dron. Umbral por defecto de 35 km/h.' },
  { icon:'visibility', title:'Visibilidad', desc:'Distancia visual horizontal. Crítica para mantener la línea de vista (VLOS). Umbral por defecto de 5 km.' },
  { icon:'rainy', title:'Lluvia y probabilidad', desc:'Precipitación actual y probabilidad de lluvia en la hora del vuelo. La mayoría de UAS no son resistentes al agua.' },
  { icon:'satellite_alt', title:'Índice Kp · GPS', desc:'Actividad geomagnética (NOAA). Un Kp alto degrada la señal GPS. Se clasifica como óptimo, degradado o no confiable.' },
  { icon:'history', title:'Histórico del vuelo', desc:'Condiciones exactas al momento de un vuelo ya realizado, visibles en el replay para análisis post-operación.' },
];

const WEIGHTS = [
  { label:'Viento a 10 m', pct:30 },
  { label:'Ráfagas', pct:22 },
  { label:'Visibilidad', pct:22 },
  { label:'Precipitación', pct:16 },
  { label:'Probabilidad de lluvia', pct:5 },
  { label:'Índice Kp (GPS)', pct:5 },
];

const COMPARE = [
  { feature:'Score de aptitud de vuelo 0-100', bitafly:true, rival:true },
  { feature:'Viento, ráfagas, visibilidad y lluvia', bitafly:true, rival:true },
  { feature:'Índice Kp / fiabilidad del GPS', bitafly:true, rival:true },
  { feature:'Integrado en la programación de la misión', bitafly:true, rival:false },
  { feature:'Badge APTO / NO APTO al despachar el vuelo', bitafly:true, rival:false },
  { feature:'Queda registrado junto al vuelo (replay y bitácora)', bitafly:true, rival:false },
  { feature:'Umbrales y enfoque RAC 100 · Colombia', bitafly:true, rival:false },
  { feature:'En español y con zona horaria local', bitafly:true, rival:false },
  { feature:'Sin instalar una app aparte', bitafly:true, rival:false },
  { feature:'Una sola plataforma para toda la operación', bitafly:true, rival:false },
];

export default function ClimaDronesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SEONav />
      <SEOBreadcrumb items={[{ label: 'Plataforma', href: '/#funciones' }, { label: 'Clima y Meteorología UAV' }]} />

      {/* HERO */}
      <section style={{padding:'80px 32px 72px',background:'#fff',position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="hero" />
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{maxWidth:'1100px',margin:'0 auto',gap:'56px',alignItems:'center'}}>
          <div>
            <div style={s.badge}><div style={s.dot}/><span style={s.badgeText}>Verificación pre-vuelo · RAC 100</span></div>
            <h1 style={s.h1}>Clima y Meteorología para <span style={s.accent}>Drones</span> antes de cada vuelo</h1>
            <p style={s.desc}>Viento, ráfagas, visibilidad, lluvia e índice Kp para la fiabilidad del GPS, resumidos en un score de aptitud de 0 a 100. Integrado en tu operación, no una app aparte.</p>
            <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
              <Link href="/registro" style={s.btnPrimary}><span className="material-symbols-outlined" style={{fontSize:'18px'}}>partly_cloudy_day</span>Comenzar gratis</Link>
              <Link href="#comparativa" style={s.btnGhost}>Bitafly vs. app de clima</Link>
            </div>
            <p style={{fontSize:'11px',fontWeight:700,color:'#94a3b8',marginTop:'14px'}}>Datos de Open-Meteo + NOAA · sin API key · sin costo extra</p>
          </div>
          <WeatherScene />
        </div>
      </section>

      {/* DARK BAND */}
      <div style={{...s.darkBand,position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="dark" />
        <div className="grid grid-cols-2 sm:grid-cols-4" style={{maxWidth:'1100px',margin:'0 auto',gap:'32px',textAlign:'center'}}>
          <div><div style={s.statVal}>0-100</div><div style={s.statLbl}>Score de aptitud</div></div>
          <div><div style={s.statVal}>6</div><div style={s.statLbl}>Variables evaluadas</div></div>
          <div><div style={s.statVal}>Kp</div><div style={s.statLbl}>Fiabilidad del GPS</div></div>
          <div><div style={s.statVal}>0</div><div style={s.statLbl}>Apps que instalar</div></div>
        </div>
      </div>

      {/* SPOTLIGHT — integración */}
      <FeatureSpotlight
        decor="minimal"
        flip
        overline="En el flujo de trabajo"
        title={<>El clima <span style={{color:accent}}>donde tomas la decisión</span></>}
        desc="No es un sitio web que abres aparte: la verificación meteorológica aparece dentro de Bitafly, justo cuando programas, despachas y revisas el vuelo. Queda asociada a la operación."
        bullets={[
          'Al programar la misión: clima del punto al elegir el municipio',
          'Al despachar: badge APTO / NO APTO en el despacho',
          'En el replay: condiciones exactas al momento del vuelo',
          'Documentado junto a la bitácora para tu SMS',
        ]}
      >
        <Image
          src="/screenshots/meteorologia.jpg"
          alt="Pantalla de Meteorología de Bitafly con viento, ráfagas y pronóstico horario"
          width={1568}
          height={718}
          className="w-full h-auto rounded-3xl shadow-2xl border border-slate-200"
        />
      </FeatureSpotlight>

      {/* QUÉ MIDE */}
      <section style={{padding:'80px 32px',background:'#f8f6f6',position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="light" />
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'56px'}}>
            <div style={s.overline}>Qué evalúa</div>
            <h2 style={s.h2}>Las variables que <span style={s.accent}>sí importan</span> para volar</h2>
            <p style={s.sectionDesc}>Cada variable tiene un umbral pensado para la operación de UAS. Si una se supera, el vuelo se marca como no apto y verás exactamente cuál fue.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{gap:'20px'}}>
            {MEASURES.map((m) => (
              <article key={m.title} style={s.card}>
                <div style={s.cardIcon}><span className="material-symbols-outlined">{m.icon}</span></div>
                <h3 style={s.cardTitle}>{m.title}</h3>
                <p style={s.cardDesc}>{m.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO SE CALCULA EL SCORE */}
      <section style={{padding:'80px 32px',background:'#fff',position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="light" />
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{maxWidth:'1100px',margin:'0 auto',gap:'56px',alignItems:'center'}}>
          <div>
            <div style={s.overline}>Cómo se calcula</div>
            <h2 style={s.h2}>Un <span style={s.accent}>score</span>, no veinte cifras sueltas</h2>
            <p style={{fontSize:'15px',fontWeight:500,color:'#64748b',lineHeight:1.65,marginBottom:'24px'}}>
              Bitafly pondera cada variable según su impacto real en el vuelo y devuelve un solo número de 0 a 100 con su semáforo. La nubosidad se excluye a propósito: a la resolución del modelo, el dato no es confiable para un punto específico.
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {WEIGHTS.map((w) => (
                <div key={w.label} style={{display:'flex',alignItems:'center',gap:'14px'}}>
                  <span style={{width:'160px',fontSize:'12px',fontWeight:700,color:'#475569',flexShrink:0}}>{w.label}</span>
                  <div style={{flex:1,height:'10px',background:'#f1f5f9',borderRadius:'5px',overflow:'hidden'}}>
                    <div style={{width:`${w.pct*3.3}%`,height:'100%',background:accent,borderRadius:'5px'}}/>
                  </div>
                  <span style={{width:'40px',textAlign:'right',fontSize:'12px',fontWeight:900,color:'#1A202C'}}>{w.pct}%</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:'#1A202C',borderRadius:'28px',padding:'32px',color:'#fff'}}>
            <div style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:accent,marginBottom:'18px'}}>Umbrales por defecto</div>
            {[
              { k:'Viento', v:'25 km/h' },
              { k:'Ráfagas', v:'35 km/h' },
              { k:'Visibilidad', v:'5 km' },
              { k:'Precipitación', v:'0.1 mm/h' },
            ].map((t,i)=>(
              <div key={t.k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 0',borderTop:i===0?'none':'1px solid rgba(255,255,255,0.07)'}}>
                <span style={{fontSize:'13px',color:'#94a3b8'}}>{t.k}</span>
                <span style={{fontSize:'15px',fontWeight:900,fontFamily:'monospace',color:'#fff'}}>{t.v}</span>
              </div>
            ))}
            <div style={{marginTop:'18px',padding:'14px 16px',background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.2)',borderRadius:'14px'}}>
              <p style={{fontSize:'12px',fontWeight:700,color:green,marginBottom:'2px'}}>Configurables por organización</p>
              <p style={{fontSize:'12px',color:'#94a3b8',lineHeight:1.5}}>Ajusta los límites según tu manual de operaciones y el tipo de aeronave.</p>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARATIVA */}
      <section id="comparativa" style={{padding:'80px 32px',background:'#f8f6f6',position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="light" />
        <div style={{maxWidth:'860px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'48px'}}>
            <div style={s.overline}>Clima integrado vs. app aparte</div>
            <h2 style={s.h2}>Bitafly Clima vs. una <span style={s.accent}>app de clima</span></h2>
            <p style={s.sectionDesc}>Las apps de meteorología para drones (como UAV Forecast) muestran buenas variables, pero viven aisladas. El clima de Bitafly nace dentro de la plataforma que ya gestiona tu operación y tu cumplimiento.</p>
          </div>
          <div style={{background:'#fff',border:'1.5px solid #f1f5f9',borderRadius:'24px',overflow:'hidden'}}>
            <div className="grid grid-cols-[1fr_56px_72px] sm:grid-cols-[1fr_110px_130px]" style={{background:'#1A202C',color:'#fff'}}>
              <div className="px-4 sm:px-5 py-4" style={{fontSize:'11px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.08em'}}>Capacidad</div>
              <div className="px-1 sm:px-3 py-4" style={{textAlign:'center',fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.04em',color:accent}}>Bitafly</div>
              <div className="px-1 sm:px-3 py-4" style={{textAlign:'center',fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.04em',color:'#94a3b8',lineHeight:1.2}}>App aislada</div>
            </div>
            {COMPARE.map((row,i)=>(
              <div key={row.feature} className="grid grid-cols-[1fr_56px_72px] sm:grid-cols-[1fr_110px_130px]" style={{borderTop:'1px solid #f1f5f9',background:i%2?'#fafafa':'#fff'}}>
                <div className="px-4 sm:px-5 py-3.5" style={{fontSize:'13px',fontWeight:500,color:'#334155',lineHeight:1.4}}>{row.feature}</div>
                <div className="py-3.5" style={{textAlign:'center'}}>
                  <span className="material-symbols-outlined" style={{fontSize:'20px',color:green}}>{row.bitafly?'check_circle':'cancel'}</span>
                </div>
                <div className="py-3.5" style={{textAlign:'center'}}>
                  <span className="material-symbols-outlined" style={{fontSize:'20px',color:row.rival?'#94a3b8':'#cbd5e1'}}>{row.rival?'check_circle':'remove'}</span>
                </div>
              </div>
            ))}
          </div>
          <p style={{fontSize:'11px',color:'#94a3b8',textAlign:'center',marginTop:'16px',lineHeight:1.5}}>Comparación basada en el enfoque de cada herramienta. Las capacidades de productos de terceros pueden cambiar; verifica siempre la información del proveedor.</p>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <SocialProofStrip heading="Operadores que vuelan con datos, no con corazonadas" />

      {/* FAQ */}
      <section style={{...s.faqSection,position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="light" />
        <div style={{maxWidth:'760px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'48px'}}>
            <div style={s.overline}>Preguntas frecuentes</div>
            <h2 style={s.h2}>Clima para <span style={s.accent}>drones</span>, sin vueltas</h2>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
            {faqSchema.mainEntity.map((f,i)=>(
              <details key={i} style={{background:'#fff',borderRadius:'16px',border:'1px solid #f1f5f9',overflow:'hidden'}}>
                <summary style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'16px',padding:'20px 22px',cursor:'pointer',listStyle:'none'}}>
                  <span style={{fontSize:'14px',fontWeight:800,color:'#1A202C'}}>{f.name}</span>
                  <span className="material-symbols-outlined faq-chevron" style={{color:accent,flexShrink:0}}>expand_more</span>
                </summary>
                <div style={{padding:'0 22px 20px',fontSize:'13px',color:'#64748b',lineHeight:1.65}}>{f.acceptedAnswer.text}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <div style={{...s.ctaBand,position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="dark" />
        <div style={{position:'relative',zIndex:1}}>
          <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#fff',marginBottom:'12px'}}>Decide cada vuelo con <span style={s.accent}>la meteorología</span> de tu lado</h2>
          <p style={{fontSize:'15px',color:'#94a3b8',maxWidth:'560px',margin:'0 auto 32px'}}>El clima ya viene dentro de Bitafly, junto a tu bitácora, despacho y cumplimiento RAC 100. Empieza gratis hoy.</p>
          <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
            <Link href="/registro" style={s.btnWhite}><span className="material-symbols-outlined" style={{fontSize:'18px'}}>partly_cloudy_day</span>Comenzar gratis</Link>
            <Link href="/bitacora-digital" style={s.btnOutlineWhite}>Ver la bitácora digital</Link>
          </div>
        </div>
      </div>

      <SEOFooter brandDesc="Verificación meteorológica pre-vuelo para operadores UAS en Colombia: viento, visibilidad e índice Kp integrados en la operación." />
    </>
  );
}
