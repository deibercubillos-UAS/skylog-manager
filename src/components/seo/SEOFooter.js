import Link from 'next/link';
import Image from 'next/image';

const PLATFORM_LINKS = [
  { href: '/bitacora-digital',        label: 'Bitácora Digital' },
  { href: '/mantenimiento-drones',    label: 'Mantenimiento' },
  { href: '/gestion-flota-drones',    label: 'Gestión de Flota' },
  { href: '/sms-aeronautico',         label: 'SMS Aeronáutico' },
  { href: '/autorizaciones-aerocivil',label: 'Autorizaciones' },
  { href: '/reportes-auditoria',      label: 'Reportes PDF' },
  { href: '/replay-gps-drones',       label: 'Replay GPS' },
  { href: '/gestion-pilotos',         label: 'Pilotos y Licencias' },
  { href: '/plan-vuelo-drones',       label: 'Plan de Vuelo KMZ' },
  { href: '/clima-drones',           label: 'Clima y Meteorología' },
  { href: '/sora',                    label: 'Análisis SORA' },
];

const COMPANY_LINKS = [
  { href: '/',                label: 'Inicio' },
  { href: '/rac-100',         label: 'Cumplimiento RAC 100' },
  { href: '/operadores-uas',  label: 'Operadores UAS' },
  { href: '/precios',         label: 'Precios' },
  { href: '/registro',        label: 'Comenzar gratis' },
  { href: '/login',           label: 'Iniciar sesión' },
];

const RESOURCES_LINKS = [
  { href: '/blog',                            label: 'Blog' },
  { href: '/documentacion',                   label: 'Documentación' },
  { href: '/casos',                           label: 'Casos de Éxito' },
  { href: '/comparativa-bitafly-airdata',     label: 'Bitafly vs AirData' },
  { href: '/comparativa-bitafly-dronedesk',   label: 'Bitafly vs Dronedesk' },
  { href: '/comparativa-bitafly-geodrone',    label: 'Bitafly vs GeoDrone' },
  { href: '/comparativa-bitafly-uav-forecast', label: 'Bitafly vs UAV Forecast' },
];

const lnkStyle = { fontSize: '12px', color: '#64748b', textDecoration: 'none' };
const colHdStyle = { fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#fff', marginBottom: '14px' };
const listStyle = { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' };

export default function SEOFooter({ brandDesc = 'Bitácora digital RAC 100 para operadores UAS en Colombia.' }) {
  return (
    <footer className="bg-[#0F1419] text-slate-500 px-8 pt-16 pb-8">
      <div className="max-w-[1100px] mx-auto grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-10 mb-12">

        {/* ── Brand ── */}
        <div className="col-span-2 md:col-span-1">
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '12px' }}>
            <Image src="/logo.png" alt="Bitafly" width={32} height={28} style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }} loading="lazy" />
            <span style={{ fontSize: '22px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', color: '#fff' }}>Bitafly</span>
          </Link>
          <p style={{ fontSize: '12px', lineHeight: 1.7, maxWidth: '280px' }}>{brandDesc}</p>

          {/* Social icons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            {/* LinkedIn */}
            <a
              href="https://www.linkedin.com/company/bitafly"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Bitafly en LinkedIn"
              className="hover:bg-blue-600 hover:text-white transition-colors"
              style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}
            >
              <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
            {/* Email */}
            <a
              href="mailto:soporte@bitafly.com"
              aria-label="Correo de soporte"
              className="hover:bg-primary hover:text-white transition-colors"
              style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* ── Plataforma ── */}
        <div>
          <div style={colHdStyle}>Plataforma</div>
          <ul style={listStyle}>
            {PLATFORM_LINKS.map(l => (
              <li key={l.href}>
                <Link href={l.href} style={lnkStyle} className="hover:text-primary transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Empresa ── */}
        <div>
          <div style={colHdStyle}>Empresa</div>
          <ul style={listStyle}>
            {COMPANY_LINKS.map(l => (
              <li key={l.href}>
                <Link href={l.href} style={lnkStyle} className="hover:text-primary transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Recursos ── */}
        <div>
          <div style={colHdStyle}>Recursos</div>
          <ul style={listStyle}>
            {RESOURCES_LINKS.map(l => (
              <li key={l.href}>
                <Link href={l.href} style={lnkStyle} className="hover:text-primary transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
          {/* RAC 100 badge */}
          <div style={{ marginTop: '20px', padding: '10px 12px', background: 'rgba(236,91,19,0.08)', borderRadius: '10px', border: '1px solid rgba(236,91,19,0.15)' }}>
            <p style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#ec5b13', marginBottom: '4px' }}>Cumplimiento</p>
            <p style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>RAC 100 · UAEAC · AeroCivil · Colombia</p>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div
        className="max-w-[1100px] mx-auto border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row justify-between gap-3"
        style={{ fontSize: '11px' }}
      >
        <span>© {new Date().getFullYear()} Bitafly Operations. Todos los derechos reservados.</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <a href="mailto:soporte@bitafly.com" style={{ color: '#475569' }} className="hover:text-primary transition-colors">soporte@bitafly.com</a>
          <span style={{ color: '#334155' }}>Hecho en Colombia para operadores UAS</span>
        </div>
      </div>
    </footer>
  );
}
