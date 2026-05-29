import Link from 'next/link';

export default function SEONav() {
  return (
    <nav style={{
      position:'sticky',top:0,zIndex:100,
      background:'rgba(255,255,255,0.92)',backdropFilter:'blur(12px)',
      borderBottom:'1px solid #f1f5f9',height:'64px',
      display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 32px'
    }}>
      <Link href="/" style={{display:'flex',alignItems:'center',gap:'10px',textDecoration:'none'}}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Bitafly" width={37} height={32} style={{objectFit:'contain',display:'block'}} />
        <span style={{fontSize:'20px',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.04em',color:'#1A202C'}}>Bitafly</span>
      </Link>
      <ul style={{display:'flex',alignItems:'center',gap:'28px',listStyle:'none',margin:0,padding:0}}>
        <li><Link href="/" style={{textDecoration:'none',fontSize:'13px',fontWeight:700,color:'#475569'}}>Inicio</Link></li>
        <li><Link href="/rac-100" style={{textDecoration:'none',fontSize:'13px',fontWeight:700,color:'#475569'}}>RAC 100</Link></li>
        <li><Link href="/gestion-flota-drones" style={{textDecoration:'none',fontSize:'13px',fontWeight:700,color:'#475569'}}>Funciones</Link></li>
        <li><Link href="/blog" style={{textDecoration:'none',fontSize:'13px',fontWeight:700,color:'#475569'}}>Blog</Link></li>
        <li><Link href="/precios" style={{textDecoration:'none',fontSize:'13px',fontWeight:700,color:'#475569'}}>Precios</Link></li>
      </ul>
      <Link href="/registro" style={{
        background:'#ec5b13',color:'#fff',padding:'9px 20px',borderRadius:'12px',
        fontSize:'11px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',
        textDecoration:'none',boxShadow:'0 4px 14px rgba(236,91,19,0.3)'
      }}>
        Comenzar gratis
      </Link>
    </nav>
  );
}
