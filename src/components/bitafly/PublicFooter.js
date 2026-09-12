// Footer público del nuevo frontend (F1) — extraído de
// src/app/preview-bitafly/page.js. Server component (sin interactividad),
// reutilizable en cualquier landing rediseñada.

import Image from 'next/image';

const FOOTER_COLUMNS = [
  {
    heading: 'Plataforma',
    links: [
      { href: '/bitacora-digital', label: 'Bitácora Digital' },
      { href: '/mantenimiento-drones', label: 'Mantenimiento' },
      { href: '/gestion-flota-drones', label: 'Gestión de Flota' },
      { href: '/sms-aeronautico', label: 'SMS Aeronáutico' },
      { href: '/capacitacion-drones', label: 'Capacitación' },
      { href: '/replay-gps-drones', label: 'Replay GPS' },
    ],
  },
  {
    heading: 'Empresa',
    links: [
      { href: '/rac-100', label: 'Cumplimiento RAC 100' },
      { href: '/operadores-uas', label: 'Operadores UAS' },
      { href: '/precios', label: 'Precios' },
      { href: '/registro', label: 'Comenzar gratis' },
      { href: '/login', label: 'Iniciar sesión' },
      { href: 'mailto:soporte@bitafly.com', label: 'Contáctanos' },
    ],
  },
  {
    heading: 'Recursos',
    links: [
      { href: '/tutoriales', label: 'Tutoriales en Video' },
      { href: '/documentacion', label: 'Documentación' },
      { href: '/reportes-auditoria', label: 'Reportes PDF' },
      { href: '/sora', label: 'Análisis SORA' },
    ],
  },
];

// Redes reales de BitaFly — nunca inventadas (regla V1):
// LinkedIn y WhatsApp verificados contra el schema.org Organization real de
// src/app/layout.js / número entregado por el usuario; YouTube ya usado en
// producción (/tutoriales, CHANNEL_URL).
const SOCIAL_LINKS = [
  {
    href: 'https://www.linkedin.com/company/bitafly',
    label: 'LinkedIn',
    icon: (
      <path d="M6.94 5a2 2 0 11-4-.02 2 2 0 014 .02zM7 8.48H3V21h4V8.48zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.68-2.91V8.48z" />
    ),
  },
  {
    href: 'https://wa.me/573213569836',
    label: 'WhatsApp',
    icon: (
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 004.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.06c-.24.68-1.39 1.3-1.92 1.38-.49.08-1.1.11-1.78-.11-.41-.13-.94-.3-1.61-.6-2.85-1.23-4.71-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94s.72-2.09.98-2.37c.24-.27.53-.34.71-.34l.51.01c.16 0 .38-.06.6.46.24.57.81 1.97.88 2.11.07.14.11.31.02.5-.09.19-.14.31-.28.48-.14.16-.29.36-.42.48-.14.13-.28.28-.12.55.16.27.71 1.18 1.53 1.91 1.05.94 1.94 1.23 2.21 1.37.27.14.43.11.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.22.6-.13.24.09 1.55.73 1.81.86.27.13.44.2.51.31.07.11.07.65-.17 1.33z" />
    ),
  },
  {
    href: 'https://www.youtube.com/@Bitafly',
    label: 'YouTube',
    icon: (
      <path d="M21.58 7.19a2.52 2.52 0 00-1.77-1.78C18.25 5 12 5 12 5s-6.25 0-7.81.41c-.86.24-1.53.9-1.77 1.78C2 8.75 2 12 2 12s0 3.25.42 4.81c.24.87.9 1.53 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.41a2.52 2.52 0 001.77-1.78C22 15.25 22 12 22 12s0-3.25-.42-4.81zM10 15V9l5.2 3z" />
    ),
  },
];

export default function PublicFooter({ brandDesc = 'Bitácora digital RAC 100 para operadores UAS en Colombia.' }) {
  return (
    <footer className="bg-navy text-navy-200 px-6 pt-14 pb-8">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt=""
              width={32}
              height={28}
              style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
              className="h-7 w-auto"
            />
            <span className="font-black text-white tracking-tight">BitaFly</span>
          </div>
          <p className="text-xs text-navy-300 mt-3 max-w-[220px] leading-relaxed">{brandDesc}</p>
          <div className="flex items-center gap-2 mt-4">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-primary/20 text-navy-300 hover:text-primary-300 flex items-center justify-center transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  {s.icon}
                </svg>
              </a>
            ))}
          </div>
        </div>
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.heading}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white mb-3">{col.heading}</p>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-xs text-navy-300 hover:text-primary-300 transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-5xl mx-auto border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row justify-between gap-3 text-xs text-navy-300">
        <span>© {new Date().getFullYear()} BitaFly S.A.S.</span>
        <a href="mailto:soporte@bitafly.com" className="hover:text-primary-300 transition-colors">
          soporte@bitafly.com
        </a>
      </div>
    </footer>
  );
}
