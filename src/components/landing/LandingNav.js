'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

// ── Plataforma mega-menu items ────────────────────────────────────────────────
const PLATFORM_ITEMS = [
  { href: '/bitacora-digital',       icon: 'menu_book',        label: 'Bitácora Digital',   desc: 'Registro RAC 100 completo' },
  { href: '/mantenimiento-drones',   icon: 'build',            label: 'Mantenimiento',       desc: 'Alertas y trazabilidad' },
  { href: '/gestion-flota-drones',   icon: 'flight',           label: 'Gestión de Flota',    desc: 'Drones y baterías' },
  { href: '/sms-aeronautico',        icon: 'health_and_safety',label: 'SMS Aeronáutico',     desc: 'Seguridad operacional' },
  { href: '/autorizaciones-aerocivil',icon:'approval',         label: 'Autorizaciones',      desc: 'F-OPS-001 AeroCivil' },
  { href: '/sora',                   icon: 'radar',            label: 'SORA',                desc: 'Espacio aéreo controlado' },
  { href: '/replay-gps-drones',      icon: 'my_location',      label: 'Replay GPS',          desc: 'Reproduce el vuelo', badge: 'Nuevo' },
  { href: '/reportes-auditoria',     icon: 'assessment',       label: 'Reportes',            desc: 'PDFs RAC 100' },
  { href: '/gestion-pilotos',        icon: 'group',            label: 'Pilotos',             desc: 'Expediente y licencias' },
  { href: '/plan-vuelo-drones',      icon: 'map',              label: 'Plan de Vuelo',       desc: 'KMZ y polígonos' },
  { href: '/clima-drones',           icon: 'partly_cloudy_day',label: 'Clima UAV',           desc: 'Verificación pre-vuelo', badge: 'Nuevo' },
];

// ── Recursos dropdown items ───────────────────────────────────────────────────
const RESOURCES_ITEMS = [
  { href: '/blog',                         icon: 'article',       label: 'Blog',              desc: 'Artículos y novedades', badge: 'Nuevo' },
  { href: '/documentacion',               icon: 'library_books', label: 'Documentación',     desc: 'Guía de uso detallada' },
  { href: '/casos',                        icon: 'star',          label: 'Casos de éxito',   desc: 'Resultados reales' },
  { href: '/comparativa-bitafly-airdata', icon: 'compare_arrows',label: 'Comparativas',      desc: 'Bitafly vs competidores' },
];

// ── Mega-menu Plataforma ──────────────────────────────────────────────────────
function MegaMenu({ onClose }) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+8px)] z-50 w-[680px] bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden"
      onMouseLeave={onClose}
    >
      {/* Header strip */}
      <div className="bg-gradient-to-r from-navy to-[#1E3A5F] px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-orange-300 mb-0.5">Plataforma Bitafly</p>
          <p className="text-white text-sm font-medium opacity-80">Todos los módulos RAC 100 en un solo lugar</p>
        </div>
        <Link
          href="/registro"
          onClick={onClose}
          className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-orange-600 transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-sm">rocket_launch</span>
          Probar gratis
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-px bg-slate-100 p-px">
        {PLATFORM_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="group flex items-start gap-3 bg-white px-5 py-4 hover:bg-orange-50 transition-colors duration-150 cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl text-primary mt-0.5 shrink-0 group-hover:scale-110 transition-transform duration-150">
              {item.icon}
            </span>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold text-navy group-hover:text-primary transition-colors">
                {item.label}
                {item.badge && (
                  <span className="bg-primary text-white text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full leading-none">
                    {item.badge}
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Footer strip */}
      <div className="bg-slate-50 px-6 py-3 flex items-center justify-between border-t border-slate-100">
        <p className="text-xs text-slate-500">
          <span className="font-bold text-navy">10 módulos</span> · Cumplimiento RAC 100 completo
        </p>
        <Link
          href="/rac-100"
          onClick={onClose}
          className="flex items-center gap-1 text-xs font-bold text-primary hover:text-orange-600 transition-colors"
        >
          Ver normativa RAC 100
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}

// ── Recursos dropdown ─────────────────────────────────────────────────────────
function ResourcesDropdown({ onClose }) {
  return (
    <div
      className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden"
      onMouseLeave={onClose}
    >
      <div className="p-2">
        {RESOURCES_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors duration-150 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg text-slate-400 group-hover:text-primary transition-colors shrink-0">
              {item.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-navy group-hover:text-primary transition-colors">{item.label}</p>
                {item.badge && (
                  <span className="bg-primary text-white text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">{item.desc}</p>
            </div>
            <span className="material-symbols-outlined text-sm text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all">
              chevron_right
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Mobile menu ───────────────────────────────────────────────────────────────
function MobileMenu({ onClose }) {
  const [openSection, setOpenSection] = useState(null);

  return (
    <div className="lg:hidden absolute inset-x-0 top-full z-40 bg-white border-t border-slate-100 shadow-2xl max-h-[85vh] overflow-y-auto">
      <div className="px-4 py-4 space-y-1">

        {/* Plataforma (expandable) */}
        <button
          onClick={() => setOpenSection(openSection === 'platform' ? null : 'platform')}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer"
        >
          <span className="text-sm font-bold text-navy">Plataforma</span>
          <span className={`material-symbols-outlined text-slate-400 transition-transform duration-200 ${openSection === 'platform' ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>
        {openSection === 'platform' && (
          <div className="pl-2 pb-2 grid grid-cols-2 gap-1">
            {PLATFORM_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-slate-50 hover:bg-orange-50 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-base text-primary shrink-0">{item.icon}</span>
                <span className="text-xs font-bold text-navy leading-tight">{item.label}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Direct links */}
        <Link href="/rac-100" onClick={onClose}
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors">
          <span className="material-symbols-outlined text-base text-slate-400">gavel</span>
          <span className="text-sm font-bold text-navy">RAC 100</span>
        </Link>

        <Link href="/precios" onClick={onClose}
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors">
          <span className="material-symbols-outlined text-base text-slate-400">price_change</span>
          <span className="text-sm font-bold text-navy">Precios</span>
        </Link>

        {/* Recursos (expandable) */}
        <button
          onClick={() => setOpenSection(openSection === 'resources' ? null : 'resources')}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer"
        >
          <span className="text-sm font-bold text-navy">Recursos</span>
          <span className={`material-symbols-outlined text-slate-400 transition-transform duration-200 ${openSection === 'resources' ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>
        {openSection === 'resources' && (
          <div className="pl-2 pb-2 space-y-0.5">
            {RESOURCES_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-orange-50 transition-colors"
              >
                <span className="material-symbols-outlined text-base text-slate-400">{item.icon}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-navy">{item.label}</span>
                  {item.badge && (
                    <span className="bg-primary text-white text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full leading-none">
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-slate-100 my-2 pt-2 space-y-2 px-1">
          <Link
            href="/login"
            onClick={onClose}
            className="block text-center w-full py-3 text-sm font-black uppercase tracking-widest text-slate-600 border border-slate-200 rounded-2xl hover:border-navy hover:text-navy transition-colors"
          >
            Ingresar
          </Link>
          <Link
            href="/registro"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-3 text-sm font-black uppercase tracking-widest text-white bg-primary rounded-2xl hover:bg-orange-600 shadow-[0_4px_14px_rgba(236,91,19,0.35)] transition-all"
          >
            Comenzar gratis
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </div>

        {/* Trust signal */}
        <div className="flex items-center justify-center gap-2 py-3">
          <span className="material-symbols-outlined text-sm text-green-600">verified</span>
          <span className="text-xs text-slate-500 font-medium">Cumplimiento RAC 100 · Colombia</span>
        </div>
      </div>
    </div>
  );
}

// ── Main LandingNav ───────────────────────────────────────────────────────────
export default function LandingNav() {
  const [scrolled, setScrolled]     = useState(false);
  const [openMenu, setOpenMenu]     = useState(null); // 'platform' | 'resources' | null
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef(null);
  const pathname = usePathname();

  // Scroll shadow
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); setOpenMenu(null); }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Precios href: on home page use anchor, elsewhere use /precios page
  const preciosHref = pathname === '/' ? '#precios' : '/precios';

  return (
    <header
      ref={navRef}
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/98 backdrop-blur-xl shadow-[0_2px_24px_rgba(0,0,0,0.09)] border-b border-slate-100'
          : 'bg-white border-b border-slate-100/80'
      }`}
    >
      {/* Skip link accessibility */}
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-[9999] focus-visible:bg-navy focus-visible:text-white focus-visible:px-4 focus-visible:py-2 focus-visible:rounded-xl focus-visible:text-sm focus-visible:font-black"
      >
        Saltar al contenido principal
      </a>

      <nav
        className="max-w-7xl mx-auto px-5 md:px-8 h-[68px] flex items-center gap-4"
        aria-label="Navegación principal"
      >
        {/* ── Logo ── */}
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0 group"
          aria-label="Bitafly — inicio"
        >
          <Image
            src="/logo.png"
            alt=""
            width={36}
            height={36}
            className="h-8 w-auto transition-transform duration-200 group-hover:scale-105"
            priority
          />
          <span className="text-xl font-black text-navy uppercase tracking-tighter">
            Bitafly
          </span>
        </Link>

        {/* ── Desktop nav (center) ── */}
        <ul
          className="hidden lg:flex items-center gap-0.5 ml-6 flex-1"
          role="menubar"
        >
          {/* Plataforma with mega menu */}
          <li className="relative" role="none">
            <button
              role="menuitem"
              aria-haspopup="true"
              aria-expanded={openMenu === 'platform'}
              onMouseEnter={() => setOpenMenu('platform')}
              onClick={() => setOpenMenu(openMenu === 'platform' ? null : 'platform')}
              className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-navy hover:bg-slate-50 transition-all duration-150 cursor-pointer select-none"
            >
              Plataforma
              <span
                className={`material-symbols-outlined text-[18px] text-slate-400 transition-transform duration-200 ${
                  openMenu === 'platform' ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>
            {openMenu === 'platform' && (
              <MegaMenu onClose={() => setOpenMenu(null)} />
            )}
          </li>

          {/* RAC 100 */}
          <li role="none">
            <Link
              href="/rac-100"
              role="menuitem"
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                pathname === '/rac-100'
                  ? 'text-primary bg-orange-50 font-bold'
                  : 'text-slate-600 hover:text-navy hover:bg-slate-50'
              }`}
            >
              RAC 100
            </Link>
          </li>

          {/* Blog — with badge */}
          <li role="none">
            <Link
              href="/blog"
              role="menuitem"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                pathname?.startsWith('/blog')
                  ? 'text-primary bg-orange-50 font-bold'
                  : 'text-slate-600 hover:text-navy hover:bg-slate-50'
              }`}
            >
              Blog
              <span className="inline-flex items-center bg-primary text-white text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full leading-none">
                Nuevo
              </span>
            </Link>
          </li>

          {/* Precios */}
          <li role="none">
            {pathname === '/' ? (
              <a
                href="#precios"
                role="menuitem"
                className="px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-navy hover:bg-slate-50 transition-all duration-150"
              >
                Precios
              </a>
            ) : (
              <Link
                href="/precios"
                role="menuitem"
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  pathname === '/precios'
                    ? 'text-primary bg-orange-50 font-bold'
                    : 'text-slate-600 hover:text-navy hover:bg-slate-50'
                }`}
              >
                Precios
              </Link>
            )}
          </li>

          {/* Recursos dropdown */}
          <li className="relative" role="none">
            <button
              role="menuitem"
              aria-haspopup="true"
              aria-expanded={openMenu === 'resources'}
              onMouseEnter={() => setOpenMenu('resources')}
              onClick={() => setOpenMenu(openMenu === 'resources' ? null : 'resources')}
              className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-navy hover:bg-slate-50 transition-all duration-150 cursor-pointer select-none"
            >
              Recursos
              <span
                className={`material-symbols-outlined text-[18px] text-slate-400 transition-transform duration-200 ${
                  openMenu === 'resources' ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>
            {openMenu === 'resources' && (
              <ResourcesDropdown onClose={() => setOpenMenu(null)} />
            )}
          </li>
        </ul>

        {/* ── CTA group (right) ── */}
        <div className="hidden lg:flex items-center gap-2.5 ml-auto shrink-0">
          {/* Trust badge */}
          <span className="hidden xl:flex items-center gap-1.5 text-[11px] font-bold text-green-700 bg-green-50 border border-green-200/80 px-3 py-1.5 rounded-full whitespace-nowrap">
            <span className="material-symbols-outlined text-sm">verified</span>
            RAC 100 Colombia
          </span>

          {/* Divider */}
          <div className="hidden xl:block w-px h-6 bg-slate-200" />

          {/* Ingresar */}
          <Link
            href="/login"
            className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 rounded-xl hover:text-navy hover:bg-slate-50 transition-all duration-150"
          >
            Ingresar
          </Link>

          {/* CTA primary */}
          <Link
            href="/registro"
            className="flex items-center gap-1.5 bg-primary text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-[0_4px_14px_rgba(236,91,19,0.30)] hover:bg-orange-600 hover:shadow-[0_6px_20px_rgba(236,91,19,0.45)] hover:-translate-y-px active:translate-y-0 transition-all duration-200"
          >
            Comenzar gratis
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>

        {/* ── Mobile hamburger ── */}
        <button
          className="lg:hidden ml-auto flex flex-col justify-center items-center w-10 h-10 gap-[5px] rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
        >
          <span
            className={`block h-0.5 w-5 bg-slate-700 rounded-full transition-all duration-200 ${
              mobileOpen ? 'rotate-45 translate-y-[7px]' : ''
            }`}
          />
          <span
            className={`block h-0.5 w-5 bg-slate-700 rounded-full transition-all duration-200 ${
              mobileOpen ? 'opacity-0 scale-x-0' : ''
            }`}
          />
          <span
            className={`block h-0.5 w-5 bg-slate-700 rounded-full transition-all duration-200 ${
              mobileOpen ? '-rotate-45 -translate-y-[7px]' : ''
            }`}
          />
        </button>
      </nav>

      {/* ── Mobile menu panel ── */}
      {/* pointer-events-none + invisible cuando está cerrado: el panel interno es
          position:absolute y escapa del recorte max-h-0/overflow-hidden, así que
          sin esto quedaría una capa invisible captando los toques sobre la página. */}
      <div
        id="mobile-menu"
        className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileOpen
            ? 'max-h-[90vh] opacity-100 pointer-events-auto'
            : 'max-h-0 opacity-0 pointer-events-none invisible'
        }`}
        aria-hidden={!mobileOpen}
      >
        <MobileMenu onClose={() => setMobileOpen(false)} />
      </div>
    </header>
  );
}
