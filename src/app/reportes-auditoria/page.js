import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';

export const metadata = {
  title: 'Reportes y Auditoría AeroCivil para Drones — Formatos PDF',
  description: 'Genera en segundos los reportes que exige la RAC 100: Maestro de Vuelo, Baterías y Bitácora de Piloto. PDF con logo corporativo y tu propio código de formato (F-OPS-002, F-MNT-003, F-HUM-005 por defecto, personalizables).',
  keywords: ['reportes auditoría AeroCivil drones', 'F-OPS-002 PDF', 'reportes RAC 100 Colombia', 'auditoría drones Colombia', 'formatos UAS UAEAC'],
  alternates: { canonical: '/reportes-auditoria' },
  openGraph: {
    title: 'Reportes AeroCivil para Drones — F-OPS-002, F-MNT-003, F-HUM-005 | Bitafly',
    description: 'Genera todos los reportes que exige la RAC 100 en PDF en menos de 5 segundos, con tu propio código de formato, logo corporativo y versión.',
    url: 'https://bitafly.com/reportes-auditoria',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿Qué reportes genera Bitafly para la AeroCivil?", "acceptedAnswer": { "@type": "Answer", "text": "Bitafly genera 4 reportes: Maestro de Vuelo, Registro de Baterías, Bitácora de Piloto y Solicitud de Autorización de Vuelo. Todos en PDF con logo corporativo, tu código de formato (F-OPS-002, F-MNT-003, F-HUM-005, F-OPS-001 por defecto) y versión." } },
    { "@type": "Question", "name": "¿Los códigos F-OPS-002, F-MNT-003 son formatos oficiales de la AeroCivil?", "acceptedAnswer": { "@type": "Answer", "text": "No. La RAC 100 no define códigos de formato oficiales. Cada empresa crea su propia nomenclatura de control documental en su manual de operaciones. Bitafly trae estos códigos por defecto y permite personalizarlos para alinearlos con tu manual." } },
    { "@type": "Question", "name": "¿Los reportes de Bitafly son aceptados por los inspectores de la AeroCivil?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Los reportes generados por Bitafly incluyen todos los campos exigidos por la RAC 100, con tu código de formato, versión, logo corporativo y firma. Están diseñados para ser presentados directamente en inspecciones de la AeroCivil." } },
    { "@type": "Question", "name": "¿En cuánto tiempo puedo exportar los reportes?", "acceptedAnswer": { "@type": "Answer", "text": "Los reportes PDF se generan en segundos. Seleccionas el período, el tipo de reporte y el formato. No hay procesamiento manual ni espera. El archivo está listo para descargar o enviar por correo inmediatamente." } },
    { "@type": "Question", "name": "¿Los reportes incluyen el logo de mi empresa?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Todos los reportes PDF incluyen el logo de tu organización, el nombre legal de la empresa, tu código de formato y la versión del documento. Puedes subir tu logo y definir tus códigos en la configuración de la organización." } },
  ],
};

const accent = '#ec5b13';

export default function ReportesAuditoriaPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SEONav />

      {/* HERO */}
      <section style={{padding:'80px 32px 72px',background:'#fff'}}>
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{maxWidth:'1100px',margin:'0 auto',gap:'56px',alignItems:'center'}}>
          <div>
            <div style={{display:'inline-flex',alignItems:'center',gap:'7px',background:'rgba(236,91,19,0.08)',border:'1px solid rgba(236,91,19,0.2)',borderRadius:'9999px',padding:'5px 14px',marginBottom:'20px'}}>
              <div style={{width:'6px',height:'6px',borderRadius:'50%',background:accent}}/>
              <span style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.15em',color:accent}}>F-OPS-002 · F-MNT-003 · F-HUM-005</span>
            </div>
            <h1 style={{fontSize:'clamp(36px,4vw,52px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',lineHeight:1.02,color:'#1A202C',marginBottom:'20px'}}>
              Reportes y Auditoría <span style={{color:accent}}>AeroCivil</span> en Segundos
            </h1>
            <p style={{fontSize:'16px',fontWeight:500,color:'#64748b',lineHeight:1.65,maxWidth:'480px',marginBottom:'28px'}}>
              Exporta los reportes que exige la RAC 100 con logo corporativo, tu propio código de formato y versión. Auditorías sin sorpresas, inspecciones sin papeles perdidos.
            </p>
            <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
              <Link href="/registro" style={{display:'inline-flex',alignItems:'center',gap:'8px',background:accent,color:'#fff',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none',boxShadow:'0 8px 24px rgba(236,91,19,0.3)'}}>
                <span className="material-symbols-outlined" style={{fontSize:'18px'}}>picture_as_pdf</span>Comenzar gratis
              </Link>
              <Link href="/rac-100" style={{display:'inline-flex',alignItems:'center',gap:'8px',border:'1.5px solid #e2e8f0',color:'#475569',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none'}}>
                Ver cumplimiento RAC 100
              </Link>
            </div>
            <p style={{fontSize:'11px',fontWeight:700,color:'#94a3b8',marginTop:'14px'}}>PDF en segundos · Logo corporativo · Tu código de formato</p>
          </div>
          {/* PDF mockup */}
          <div style={{background:'#f8fafc',border:'1.5px solid #e2e8f0',borderRadius:'24px',overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,0.06)'}}>
            <div style={{background:'#1A202C',padding:'12px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',color:'#fff'}}>Reporte de Auditoría</div>
              <span className="material-symbols-outlined" style={{color:accent,fontSize:'18px'}}>picture_as_pdf</span>
            </div>
            <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:'10px'}}>
              {[
                { icon:'description', name:'Maestro de Vuelo', sub:'Abr 2025 · 22 vuelos', code:'F-OPS-002' },
                { icon:'table_view', name:'Registro de Baterías', sub:'Q1 2025 · 4 baterías', code:'F-MNT-003' },
                { icon:'badge', name:'Bitácora de Piloto', sub:'C. Martínez · 412h', code:'F-HUM-005' },
              ].map(r => (
                <div key={r.code} style={{background:'#fff',border:'1px solid #f1f5f9',borderRadius:'12px',padding:'14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <div style={{width:'36px',height:'36px',background:'rgba(236,91,19,0.08)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <span className="material-symbols-outlined" style={{fontSize:'18px',color:accent}}>{r.icon}</span>
                    </div>
                    <div>
                      <div style={{fontSize:'11px',fontWeight:900,color:'#1A202C'}}>{r.name}</div>
                      <div style={{fontSize:'9px',color:'#94a3b8'}}>{r.sub}</div>
                    </div>
                  </div>
                  <span style={{fontFamily:'monospace',fontSize:'11px',fontWeight:700,color:accent,background:'rgba(236,91,19,0.06)',padding:'3px 8px',borderRadius:'6px'}}>{r.code}</span>
                </div>
              ))}
              <div style={{background:accent,borderRadius:'12px',padding:'12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',color:'#fff'}}>Descargar todos (ZIP)</span>
                <span className="material-symbols-outlined" style={{fontSize:'18px',color:'#fff'}}>cloud_done</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DARK BAND */}
      <div style={{background:'#1A202C',color:'#fff',padding:'56px 32px'}}>
        <div className="grid grid-cols-2 sm:grid-cols-4" style={{maxWidth:'1100px',margin:'0 auto',gap:'32px',textAlign:'center'}}>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>4</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Reportes RAC 100</div></div>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>&lt;5s</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Tiempo de generación</div></div>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>PDF</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Con logo corporativo</div></div>
          <div><div style={{fontSize:'36px',fontWeight:900,color:accent}}>0</div><div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:'#64748b',marginTop:'6px'}}>Datos incompletos</div></div>
        </div>
      </div>

      {/* REPORTES */}
      <section style={{padding:'80px 32px',background:'#f8f6f6'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'56px'}}>
            <div style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.3em',color:accent,marginBottom:'12px'}}>Reportes RAC 100</div>
            <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#1A202C'}}>Cada registro que exige <span style={{color:accent}}>la AeroCivil</span></h2>
            <p style={{fontSize:'13px',color:'#64748b',lineHeight:1.7,maxWidth:'560px',margin:'14px auto 0'}}>Los códigos de formato no son oficiales de la AeroCivil: cada operador los define en su manual de operaciones. En Bitafly vienen por defecto y los personalizas.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{gap:'20px',maxWidth:'800px',margin:'0 auto'}}>
            {[
              { icon:'description', code:'F-OPS-002', title:'Maestro de Vuelo', desc:'Registro cronológico de todos los vuelos del período: aeronave, tripulación, misión, tiempos y horas acumuladas. El reporte principal de la bitácora digital.', features:['Filtro por período, aeronave o piloto', 'Total de horas por aeronave', 'Logo corporativo y tu código de formato'] },
              { icon:'table_view', code:'F-MNT-003', title:'Registro de Baterías', desc:'Estado de cada batería con número de serie, ciclos acumulados, historial de intervenciones y estado actual. Esencial para inspecciones técnicas.', features:['Ciclos por batería con historial', 'Estado: Operativa / Retirada', 'Eventos de inflamiento registrados'] },
              { icon:'badge', code:'F-HUM-005', title:'Bitácora de Piloto', desc:'Libro de vuelo individual por tripulante con todas las operaciones realizadas, horas totales y validez de certificados médico y de piloto.', features:['Horas totales por piloto', 'Vigencia de médico aeronáutico', 'Misiones por aeronave'] },
              { icon:'fact_check', code:'F-OPS-001', title:'Solicitud de Autorización', desc:'Formato de autorización de vuelo con datos de aeronave, tripulación certificada, zona de operación, póliza vigente y firma digital.', features:['Coordenadas del polígono', 'Póliza RC vinculada', 'Listo para radicar ante UAEAC'] },
            ].map(r => (
              <article key={r.code} style={{background:'#fff',border:'1.5px solid #f1f5f9',borderRadius:'20px',padding:'28px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px'}}>
                  <div style={{width:'48px',height:'48px',background:'rgba(236,91,19,0.08)',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',color:accent}}>
                    <span className="material-symbols-outlined">{r.icon}</span>
                  </div>
                  <span style={{fontFamily:'monospace',fontSize:'11px',fontWeight:700,color:accent,background:'rgba(236,91,19,0.06)',padding:'3px 8px',borderRadius:'6px'}}>{r.code}</span>
                </div>
                <h3 style={{fontSize:'13px',fontWeight:900,textTransform:'uppercase',color:'#1A202C',marginBottom:'8px'}}>{r.title}</h3>
                <p style={{fontSize:'13px',color:'#64748b',lineHeight:1.6,marginBottom:'12px'}}>{r.desc}</p>
                <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:'6px'}}>
                  {r.features.map(f => (
                    <li key={f} style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'12px',color:'#475569'}}>
                      <span className="material-symbols-outlined" style={{fontSize:'14px',color:accent}}>check_circle</span>{f}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{background:'#f8f6f6',padding:'80px 32px'}}>
        <div style={{maxWidth:'760px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'48px'}}>
            <div style={{fontSize:'10px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.3em',color:accent,marginBottom:'12px'}}>Reportes — Preguntas</div>
            <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#1A202C'}}>Todo sobre los <span style={{color:accent}}>reportes RAC 100</span></h2>
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
        <h2 style={{fontSize:'clamp(28px,3vw,44px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#fff',marginBottom:'12px'}}>Auditoría lista en <span style={{color:accent}}>menos de 60 segundos</span></h2>
        <p style={{fontSize:'15px',color:'#94a3b8',maxWidth:'560px',margin:'0 auto 32px'}}>Todos los reportes que exige la RAC 100 generados automáticamente desde tus datos de operación, con tu propio código de formato.</p>
        <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
          <Link href="/registro" style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'#fff',color:'#1A202C',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none'}}>
            <span className="material-symbols-outlined" style={{fontSize:'18px'}}>picture_as_pdf</span>Comenzar gratis
          </Link>
          <Link href="/rac-100" style={{display:'inline-flex',alignItems:'center',gap:'8px',border:'1.5px solid rgba(255,255,255,0.2)',color:'#fff',padding:'14px 28px',borderRadius:'16px',fontSize:'12px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',textDecoration:'none'}}>
            Ver cumplimiento RAC 100
          </Link>
        </div>
      </div>

      <SEOFooter brandDesc="Reportes RAC 100 para operadores UAS en Colombia, con tu propio código de formato. F-OPS-002, F-MNT-003, F-HUM-005." />
    </>
  );
}
