import Link from 'next/link';
import Image from 'next/image';

export default function SEOFooter({ brandDesc = 'Bitácora digital RAC 100 para operadores UAS en Colombia.' }) {
  return (
    <footer className="bg-[#0F1419] text-slate-500 px-8 pt-14 pb-8">
      <div className="max-w-[1100px] mx-auto grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-10 mb-10">
        <div>
          <Link href="/" style={{display:'inline-flex',alignItems:'center',gap:'10px',textDecoration:'none',marginBottom:'12px'}}>
            {/* next/image: auto-WebP, lazy load, no CLS */}
            <Image src="/logo.png" alt="Bitafly" width={32} height={28} style={{objectFit:'contain',filter:'brightness(0) invert(1)'}} loading="lazy" />
            <span style={{fontSize:'22px',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#fff'}}>Bitafly</span>
          </Link>
          <p style={{fontSize:'12px',lineHeight:1.7,maxWidth:'280px'}}>{brandDesc}</p>
        </div>
        <div>
          <div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.15em',color:'#fff',marginBottom:'14px'}}>Plataforma</div>
          <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:'8px'}}>
            <li><Link href="/bitacora-digital" style={{fontSize:'12px',color:'#64748b',textDecoration:'none'}}>Bitácora Digital</Link></li>
            <li><Link href="/mantenimiento-drones" style={{fontSize:'12px',color:'#64748b',textDecoration:'none'}}>Mantenimiento</Link></li>
            <li><Link href="/sms-aeronautico" style={{fontSize:'12px',color:'#64748b',textDecoration:'none'}}>SMS Aeronáutico</Link></li>
            <li><Link href="/autorizaciones-aerocivil" style={{fontSize:'12px',color:'#64748b',textDecoration:'none'}}>Autorizaciones</Link></li>
            <li><Link href="/reportes-auditoria" style={{fontSize:'12px',color:'#64748b',textDecoration:'none'}}>Reportes PDF</Link></li>
          </ul>
        </div>
        <div>
          <div style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.15em',color:'#fff',marginBottom:'14px'}}>Empresa</div>
          <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:'8px'}}>
            <li><Link href="/" style={{fontSize:'12px',color:'#64748b',textDecoration:'none'}}>Inicio</Link></li>
            <li><Link href="/rac-100" style={{fontSize:'12px',color:'#64748b',textDecoration:'none'}}>Cumplimiento RAC 100</Link></li>
            <li><Link href="/operadores-uas" style={{fontSize:'12px',color:'#64748b',textDecoration:'none'}}>Operadores UAS</Link></li>
            <li><Link href="/gestion-flota-drones" style={{fontSize:'12px',color:'#64748b',textDecoration:'none'}}>Gestión de Flota</Link></li>
            <li><Link href="/precios" style={{fontSize:'12px',color:'#64748b',textDecoration:'none'}}>Precios</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row justify-between gap-2" style={{fontSize:'11px'}}>
        <span>© 2025 Bitafly Operations. Todos los derechos reservados.</span>
        <span>Hecho en Colombia para operadores UAS</span>
      </div>
    </footer>
  );
}
