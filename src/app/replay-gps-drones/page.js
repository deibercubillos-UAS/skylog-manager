import Link from 'next/link';
import Image from 'next/image';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';
import SEOBreadcrumb from '@/components/seo/SEOBreadcrumb';
import SocialProofStrip from '@/components/seo/SocialProofStrip';
import Decor from '@/components/landing/Decor';
import FeatureSpotlight from '@/components/landing/FeatureSpotlight';

export const metadata = {
  title: 'Replay GPS de Vuelo para Drones — Reproduce tu Vuelo DJI',
  description: 'Reproduce cada vuelo de tus drones cuadro a cuadro sobre el mapa: ruta GPS, altitud, velocidad, batería y joysticks RC. Importa el log del DJI RC/RC 2 y analiza la operación. Prueba gratis.',
  keywords: ['replay GPS drones', 'reproducción de vuelo drone', 'replay vuelo DJI', 'análisis de vuelo drones Colombia', 'telemetría DJI', 'ruta GPS dron'],
  alternates: { canonical: '/replay-gps-drones' },
  openGraph: {
    title: 'Replay GPS de Vuelo para Drones | Bitafly',
    description: 'Reproduce el vuelo cuadro a cuadro: ruta GPS animada, altitud, velocidad, batería y joysticks RC. Desde el log del DJI RC/RC 2.',
    url: 'https://bitafly.com/replay-gps-drones',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿Qué es el replay GPS de vuelo en Bitafly?", "acceptedAnswer": { "@type": "Answer", "text": "Es la reproducción animada de un vuelo realizado, dibujada sobre el mapa a partir de la telemetría real del dron. Avanza cuadro a cuadro mostrando la ruta GPS, la altitud, la velocidad, la distancia, el nivel de batería y la posición de los joysticks del control en cada instante." } },
    { "@type": "Question", "name": "¿Cómo se genera el replay de un vuelo?", "acceptedAnswer": { "@type": "Answer", "text": "Subes el archivo .txt del registro de vuelo de tu control DJI RC o RC 2. Bitafly lo procesa en el navegador (parser WASM) y reconstruye la ruta y la telemetría completa. No necesitas digitar nada: el vuelo queda vinculado a su registro en la bitácora." } },
    { "@type": "Question", "name": "¿Qué datos muestra el replay?", "acceptedAnswer": { "@type": "Answer", "text": "La ruta GPS sobre el mapa con punto de despegue y posición del dron, la altitud, la velocidad horizontal, la distancia recorrida, el tiempo de vuelo, el nivel de batería y los movimientos de los joysticks del control en tiempo real. Sirve para analizar la operación, capacitar pilotos e investigar incidentes." } },
    { "@type": "Question", "name": "¿Por cuánto tiempo se guardan los replays?", "acceptedAnswer": { "@type": "Answer", "text": "Depende del plan: Piloto guarda hasta 10 replays por 30 días, Escuadrilla 50 replays por 90 días, Flota 200 replays por 180 días y Enterprise replays ilimitados de forma permanente. Los archivos se almacenan cifrados en la nube y se sirven mediante enlaces firmados temporales." } },
  ],
};

const accent = '#ec5b13';

const s = {
  badge: { display:'inline-flex',alignItems:'center',gap:'7px',background:'rgba(236,91,19,0.08)',border:'1px solid rgba(236,91,19,0.2)',borderRadius:'9999px',padding:'5px 14px',marginBottom:'20px' },
  dot: { width:'6px',height:'6px',borderRadius:'50%',background:accent },
  badgeText: { fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.15em',color:accent },
  h1: { fontSize:'clamp(36px,4vw,52px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',lineHeight:1.02,color:'#1A202C',marginBottom:'20px' },
  accent: { color:accent },
  desc: { fontSize:'16px',fontWeight:500,color:'#64748b',lineHeight:1.65,maxWidth:'480px',marginBottom:'28px' },
  btnPrimary: { display:'inline-flex',alignItems:'center',gap:'8px',background:accent,color:'#fff',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none',boxShadow:'0 8px 24px rgba(236,91,19,0.3)' },
  btnGhost: { display:'inline-flex',alignItems:'center',gap:'8px',border:'1.5px solid #e2e8f0',color:'#475569',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none' },
  statVal: { fontSize:'36px',fontWeight:900,color:accent },
  statLbl: { fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px' },
  overline: { fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.3em',color:accent,marginBottom:'12px' },
  h2: { fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',lineHeight:1.05,color:'#1A202C',marginBottom:'16px' },
  card: { background:'#fff',border:'1.5px solid #f1f5f9',borderRadius:'28px',padding:'28px' },
  cardIcon: { width:'48px',height:'48px',background:'rgba(236,91,19,0.08)',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',color:accent,marginBottom:'16px' },
  cardTitle: { fontSize:'13px',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.01em',color:'#1A202C',marginBottom:'8px' },
  cardDesc: { fontSize:'13px',color:'#64748b',lineHeight:1.6 },
  chip: { display:'inline-block',fontFamily:'monospace',fontSize:'11px',fontWeight:700,color:accent,background:'rgba(236,91,19,0.06)',padding:'3px 8px',borderRadius:'6px' },
};

const FEATURES = [
  { icon:'route', title:'Ruta GPS Animada', desc:'La trayectoria completa del vuelo dibujada sobre el mapa, con punto de despegue y la posición del dron avanzando cuadro a cuadro. Identifica desvíos, vueltas y zonas sobrevoladas de un vistazo.' },
  { icon:'speed', title:'Telemetría Sincronizada', desc:'Altitud, velocidad, distancia recorrida y tiempo de vuelo actualizados en cada instante del replay. Revisa si la operación respetó los límites de altura y la zona autorizada.' },
  { icon:'sports_esports', title:'Joysticks del Control', desc:'Reproducción de los movimientos de los sticks del DJI RC/RC 2 en tiempo real. Ideal para capacitación: ve exactamente qué hizo el piloto en cada maniobra.' },
  { icon:'battery_charging_full', title:'Curva de Batería', desc:'El nivel de batería a lo largo del vuelo, sincronizado con la ruta. Detecta consumos anómalos y valida los márgenes de seguridad de retorno a casa.' },
  { icon:'sync', title:'Importación DJI Automática', desc:'Sube el .txt del control DJI RC o RC 2 y Bitafly reconstruye todo en segundos (parser WASM en el navegador). Sin digitar coordenadas, sin software de escritorio.' },
  { icon:'gpp_good', title:'Evidencia para SMS y Auditoría', desc:'Adjunta el replay a un reporte de incidente o a una inspección de la AeroCivil. La reconstrucción objetiva del vuelo respalda tu investigación y tu cumplimiento.' },
];

const USE_CASES = [
  { icon:'fact_check', title:'Investigación de incidentes', desc:'Reconstruye qué pasó antes de un evento: altura, velocidad, batería y maniobras del piloto. Base objetiva para tu SMS aeronáutico.' },
  { icon:'school', title:'Capacitación de pilotos', desc:'Revisa los vuelos con tu equipo, analiza los movimientos de los joysticks y corrige técnica sobre evidencia real, no sobre recuerdos.' },
  { icon:'gavel', title:'Verificación de cumplimiento', desc:'Comprueba que la operación se mantuvo dentro de la zona y la altitud autorizadas. Respalda lo que reportas ante la AeroCivil y tus clientes.' },
  { icon:'handshake', title:'Reporte al cliente', desc:'Demuestra el área cubierta y la ejecución del trabajo con una reproducción visual del vuelo. Transparencia que diferencia tu operación.' },
];

const PLANS = [
  { plan:'Piloto',       flights:'10 replays',  retention:'30 días',     featured:false },
  { plan:'Escuadrilla',  flights:'50 replays',  retention:'90 días',     featured:false },
  { plan:'Flota',        flights:'200 replays', retention:'180 días',    featured:true  },
  { plan:'Enterprise',   flights:'Ilimitados',  retention:'Permanente',  featured:false },
];

export default function ReplayGpsDronesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SEONav />
      <SEOBreadcrumb items={[{ label: 'Plataforma', href: '/#funciones' }, { label: 'Replay GPS de Vuelo' }]} />

      {/* HERO */}
      <section style={{padding:'80px 32px 72px',background:'#fff',position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="hero" />
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{maxWidth:'1100px',margin:'0 auto',gap:'56px',alignItems:'center'}}>
          <div>
            <div style={s.badge}><div style={s.dot}/><span style={s.badgeText}>Replay GPS · Telemetría DJI</span></div>
            <h1 style={s.h1}>Reproduce el Vuelo <span style={s.accent}>Cuadro a Cuadro</span></h1>
            <p style={s.desc}>
              Vuelve a ver cada operación dibujada sobre el mapa: ruta GPS, altitud, velocidad,
              batería y joysticks del control en tiempo real. Importa el log del DJI RC/RC 2 y
              analiza el vuelo como si estuvieras ahí.
            </p>
            <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
              <Link href="/registro" style={s.btnPrimary}><span className="material-symbols-outlined" style={{fontSize:'18px'}}>play_circle</span>Reproducir mi vuelo</Link>
              <Link href="/bitacora-digital" style={s.btnGhost}>Ver bitácora digital</Link>
            </div>
            <p style={{fontSize:'11px',fontWeight:700,color:'#94a3b8',marginTop:'14px'}}>Desde el log del DJI RC/RC 2 · Sin software de escritorio · Sin tarjeta de crédito</p>
          </div>

          {/* Replay visual mockup */}
          <div style={{background:'#0F1623',borderRadius:'24px',overflow:'hidden',boxShadow:'0 18px 50px rgba(15,22,35,0.35)',border:'1px solid rgba(255,255,255,0.06)'}}>
            <div style={{padding:'12px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <span className="material-symbols-outlined" style={{color:accent,fontSize:'18px'}}>my_location</span>
                <span style={{fontSize:'11px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',color:'#fff'}}>Replay de Vuelo</span>
              </div>
              <span style={{fontFamily:'monospace',fontSize:'10px',fontWeight:700,color:accent,background:'rgba(236,91,19,0.12)',padding:'3px 8px',borderRadius:'6px'}}>DJI RC 2</span>
            </div>

            {/* Map area with flight path */}
            <div style={{position:'relative',background:'linear-gradient(135deg,#13203a 0%,#0F1623 100%)'}}>
              <svg viewBox="0 0 400 240" width="100%" height="240" role="img" aria-label="Reproducción de la ruta GPS de un vuelo sobre el mapa" style={{display:'block'}}>
                {/* grid */}
                {[40,80,120,160,200].map(y => (
                  <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                ))}
                {[80,160,240,320].map(x => (
                  <line key={`v${x}`} x1={x} y1="0" x2={x} y2="240" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                ))}
                {/* flight path */}
                <path
                  d="M48 196 C 90 150, 70 96, 130 84 S 232 120, 250 70 S 320 40, 352 78"
                  fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round"
                  strokeDasharray="3 0" opacity="0.95"
                />
                {/* takeoff point */}
                <g>
                  <circle cx="48" cy="196" r="7" fill="rgba(34,197,94,0.18)" />
                  <circle cx="48" cy="196" r="3.5" fill="#22c55e" />
                </g>
                {/* current drone position */}
                <g>
                  <circle cx="352" cy="78" r="11" fill="rgba(236,91,19,0.18)" />
                  <circle cx="352" cy="78" r="5" fill={accent} stroke="#fff" strokeWidth="1.5" />
                </g>
                <text x="58" y="214" fill="#64748b" fontSize="9" fontFamily="monospace">DESPEGUE</text>
              </svg>

              {/* telemetry overlay */}
              <div style={{position:'absolute',top:'12px',left:'12px',display:'flex',flexDirection:'column',gap:'6px'}}>
                {[
                  { l:'ALTITUD', v:'118 m' },
                  { l:'VELOCIDAD', v:'9.4 m/s' },
                  { l:'DISTANCIA', v:'1.42 km' },
                ].map(t => (
                  <div key={t.l} style={{background:'rgba(15,22,35,0.72)',backdropFilter:'blur(4px)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'5px 9px'}}>
                    <div style={{fontSize:'7px',fontWeight:900,letterSpacing:'0.12em',color:'#64748b'}}>{t.l}</div>
                    <div style={{fontSize:'12px',fontWeight:800,color:'#fff',fontFamily:'monospace'}}>{t.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* scrubber + sticks */}
            <div style={{padding:'14px 18px',display:'flex',flexDirection:'column',gap:'12px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <span className="material-symbols-outlined" style={{color:accent,fontSize:'20px'}}>pause_circle</span>
                <div style={{flex:1,height:'5px',borderRadius:'9999px',background:'rgba(255,255,255,0.1)',position:'relative'}}>
                  <div style={{position:'absolute',left:0,top:0,bottom:0,width:'72%',borderRadius:'9999px',background:accent}} />
                  <div style={{position:'absolute',left:'72%',top:'50%',transform:'translate(-50%,-50%)',width:'12px',height:'12px',borderRadius:'50%',background:'#fff',border:`2px solid ${accent}`}} />
                </div>
                <span style={{fontFamily:'monospace',fontSize:'10px',color:'#94a3b8'}}>02:41 / 03:44</span>
              </div>
              <div style={{display:'flex',gap:'10px'}}>
                {/* RC sticks */}
                {[{l:'STICK IZQ',x:'70%',y:'40%'},{l:'STICK DER',x:'35%',y:'60%'}].map(stk => (
                  <div key={stk.l} style={{flex:1,display:'flex',alignItems:'center',gap:'8px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'10px',padding:'8px 10px'}}>
                    <div style={{position:'relative',width:'28px',height:'28px',borderRadius:'50%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',flexShrink:0}}>
                      <div style={{position:'absolute',left:stk.x,top:stk.y,transform:'translate(-50%,-50%)',width:'8px',height:'8px',borderRadius:'50%',background:accent}} />
                    </div>
                    <div>
                      <div style={{fontSize:'7px',fontWeight:900,letterSpacing:'0.1em',color:'#64748b'}}>{stk.l}</div>
                      <div style={{fontSize:'10px',fontWeight:800,color:'#fff'}}>RC 2</div>
                    </div>
                  </div>
                ))}
                {/* battery */}
                <div style={{flex:1,display:'flex',alignItems:'center',gap:'8px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'10px',padding:'8px 10px'}}>
                  <span className="material-symbols-outlined" style={{color:'#22c55e',fontSize:'20px'}}>battery_5_bar</span>
                  <div>
                    <div style={{fontSize:'7px',fontWeight:900,letterSpacing:'0.1em',color:'#64748b'}}>BATERÍA</div>
                    <div style={{fontSize:'10px',fontWeight:800,color:'#fff',fontFamily:'monospace'}}>63%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DARK BAND */}
      <div style={{background:'#1A202C',color:'#fff',padding:'56px 32px',position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="dark" />
        <div className="grid grid-cols-2 sm:grid-cols-4" style={{maxWidth:'1100px',margin:'0 auto',gap:'32px',textAlign:'center'}}>
          <div><div style={s.statVal}>GPS</div><div style={s.statLbl}>Ruta cuadro a cuadro</div></div>
          <div><div style={s.statVal}>5+</div><div style={s.statLbl}>Variables de telemetría</div></div>
          <div><div style={s.statVal}>DJI</div><div style={s.statLbl}>RC / RC 2 compatible</div></div>
          <div><div style={s.statVal}>0</div><div style={s.statLbl}>Software a instalar</div></div>
        </div>
      </div>

            {/* SPOTLIGHT */}
      <FeatureSpotlight
        decor="minimal"
        overline="Análisis post-vuelo"
        title={<>Reproduce cada vuelo <span style={{color:'#ec5b13'}}>cuadro a cuadro</span></>}
        desc="Importa el log del DJI RC y revive la operación sobre el mapa: ruta GPS, altitud, velocidad, batería y los joysticks del control, segundo a segundo."
        bullets={[
          'Ruta GPS animada sobre el mapa con línea de tiempo',
          'Telemetría de altitud, velocidad y batería en cada punto',
          'Posición de los joysticks del control en tiempo real',
          'Importación directa del log del DJI RC / RC 2',
        ]}
      >
        <Image
          src="/screenshots/replay-gps-upload.jpg"
          alt="Pantalla de carga del Replay GPS de Bitafly"
          width={1568}
          height={718}
          className="w-full h-auto rounded-3xl shadow-2xl border border-slate-200"
        />
      </FeatureSpotlight>

      {/* FEATURES */}
      <section style={{padding:'80px 32px',background:'#f8f6f6',position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="light" />
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'56px'}}>
            <div style={s.overline}>Qué reconstruye</div>
            <h2 style={s.h2}>Tu vuelo, <span style={s.accent}>de vuelta en pantalla</span></h2>
            <p style={{fontSize:'15px',color:'#64748b',lineHeight:1.7,maxWidth:'620px',margin:'0 auto'}}>
              El replay no es solo un mapa: sincroniza cada variable del vuelo en el tiempo para que
              entiendas exactamente qué pasó, segundo a segundo.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{gap:'20px'}}>
            {FEATURES.map(item => (
              <article key={item.icon} style={s.card}>
                <div style={s.cardIcon}><span className="material-symbols-outlined">{item.icon}</span></div>
                <h3 style={s.cardTitle}>{item.title}</h3>
                <p style={s.cardDesc}>{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section style={{padding:'80px 32px',background:'#fff'}}>
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{maxWidth:'1100px',margin:'0 auto',gap:'56px',alignItems:'center'}}>
          <div>
            <div style={s.overline}>En 3 pasos</div>
            <h2 style={s.h2}>De tu control DJI <span style={s.accent}>al replay</span></h2>
            <div style={{display:'flex',flexDirection:'column',gap:'18px',marginTop:'24px'}}>
              {[
                { n:'1', t:'Copia el registro del control', d:'Conecta tu DJI RC o RC 2 y copia la carpeta FlightRecord al computador (o usa el .txt del vuelo).' },
                { n:'2', t:'Súbelo desde la bitácora', d:'En el vuelo registrado pulsa Replay y arrastra el archivo .txt. Bitafly lo procesa en el navegador en segundos.' },
                { n:'3', t:'Reproduce y analiza', d:'Avanza, pausa y retrocede el vuelo cuadro a cuadro. Revisa ruta, altitud, velocidad, batería y joysticks.' },
              ].map(step => (
                <div key={step.n} style={{display:'flex',gap:'16px',alignItems:'flex-start'}}>
                  <div style={{width:'34px',height:'34px',borderRadius:'12px',background:accent,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:'14px',flexShrink:0}}>{step.n}</div>
                  <div>
                    <div style={{fontSize:'14px',fontWeight:900,color:'#1A202C',marginBottom:'3px'}}>{step.t}</div>
                    <div style={{fontSize:'13px',color:'#64748b',lineHeight:1.6}}>{step.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Use cases */}
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{gap:'16px'}}>
            {USE_CASES.map(uc => (
              <div key={uc.title} style={{background:'#0F1623',borderRadius:'20px',padding:'22px',border:'1px solid rgba(255,255,255,0.06)'}}>
                <div style={{width:'40px',height:'40px',borderRadius:'12px',background:'rgba(236,91,19,0.14)',display:'flex',alignItems:'center',justifyContent:'center',color:accent,marginBottom:'12px'}}>
                  <span className="material-symbols-outlined">{uc.icon}</span>
                </div>
                <div style={{fontSize:'13px',fontWeight:900,color:'#fff',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'-0.01em'}}>{uc.title}</div>
                <div style={{fontSize:'12px',color:'#94a3b8',lineHeight:1.6}}>{uc.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RETENCIÓN POR PLAN */}
      <section style={{padding:'80px 32px',background:'#f8f6f6',position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="light" />
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'48px'}}>
            <div style={s.overline}>Almacenamiento en la nube</div>
            <h2 style={s.h2}>Replays guardados <span style={s.accent}>según tu plan</span></h2>
            <p style={{fontSize:'15px',color:'#64748b',lineHeight:1.7,maxWidth:'620px',margin:'0 auto'}}>
              Los replays se almacenan cifrados y se sirven con enlaces firmados temporales. La
              cantidad y el tiempo de retención crecen con tu plan.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{gap:'18px'}}>
            {PLANS.map(p => (
              <div key={p.plan} style={{
                background: p.featured ? '#1A202C' : '#fff',
                border: p.featured ? `1.5px solid ${accent}` : '1.5px solid #f1f5f9',
                borderRadius:'24px', padding:'26px', position:'relative',
              }}>
                {p.featured && (
                  <span style={{position:'absolute',top:'-11px',left:'50%',transform:'translateX(-50%)',background:accent,color:'#fff',fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.12em',padding:'4px 12px',borderRadius:'9999px'}}>Más popular</span>
                )}
                <div style={{fontSize:'11px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.12em',color: p.featured ? accent : '#94a3b8',marginBottom:'14px'}}>{p.plan}</div>
                <div style={{display:'flex',alignItems:'baseline',gap:'6px',marginBottom:'4px'}}>
                  <span style={{fontSize:'24px',fontWeight:900,color: p.featured ? '#fff' : '#1A202C'}}>{p.flights}</span>
                </div>
                <div style={{fontSize:'12px',color: p.featured ? '#94a3b8' : '#64748b'}}>Retención: <strong style={{color: p.featured ? '#fff' : '#1A202C'}}>{p.retention}</strong></div>
              </div>
            ))}
          </div>
          <p style={{textAlign:'center',fontSize:'12px',color:'#94a3b8',marginTop:'24px'}}>
            La limpieza de replays vencidos es automática. Consulta los detalles en <Link href="/precios" style={{color:accent,fontWeight:700,textDecoration:'none'}}>planes y precios →</Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section style={{background:'#fff',padding:'80px 32px',position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="light" />
        <div style={{maxWidth:'760px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'48px'}}>
            <div style={s.overline}>Replay GPS — Preguntas</div>
            <h2 style={s.h2}>Todo sobre el <span style={s.accent}>replay de vuelo</span></h2>
          </div>
          {faqSchema.mainEntity.map((item, i) => (
            <details key={i} style={{background:'#f8f6f6',border:'1.5px solid #f1f5f9',borderRadius:'18px',overflow:'hidden',marginBottom:'10px'}}>
              <summary style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px',cursor:'pointer',listStyle:'none',fontSize:'14px',fontWeight:900,color:'#1A202C'}}>
                {item.name}
                <span className="material-symbols-outlined faq-chevron" style={{fontSize:'20px',color:accent,flexShrink:0}}>expand_more</span>
              </summary>
              <p style={{padding:'0 22px 18px',fontSize:'13px',color:'#64748b',lineHeight:1.7}}>{item.acceptedAnswer.text}</p>
            </details>
          ))}
        </div>
      </section>

      <SocialProofStrip heading="Operadores que analizan sus vuelos con Bitafly" />

      {/* CTA */}
      <div style={{background:'#1A202C',padding:'80px 32px',textAlign:'center',position:'relative',overflow:'hidden',isolation:'isolate'}}>
        <Decor variant="dark" />
        <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#fff',marginBottom:'12px'}}>Vuelve a volar <span style={s.accent}>cada misión</span></h2>
        <p style={{fontSize:'15px',color:'#94a3b8',maxWidth:'560px',margin:'0 auto 32px'}}>Sube el log de tu DJI y reproduce el vuelo cuadro a cuadro. Disponible en todos los planes.</p>
        <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
          <Link href="/registro" style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'#fff',color:'#1A202C',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none'}}>
            <span className="material-symbols-outlined" style={{fontSize:'18px'}}>play_circle</span>Comenzar gratis
          </Link>
          <Link href="/bitacora-digital" style={{display:'inline-flex',alignItems:'center',gap:'8px',border:'1.5px solid rgba(255,255,255,0.2)',color:'#fff',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none'}}>
            Ver bitácora digital
          </Link>
        </div>
      </div>

      <SEOFooter brandDesc="Replay GPS de vuelo para operadores UAS en Colombia. Reproduce la ruta, la telemetría y los joysticks desde el log del DJI RC/RC 2." />
    </>
  );
}
