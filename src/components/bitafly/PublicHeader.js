'use client';

// Header público del nuevo frontend (F1) — extraído de
// src/app/preview-bitafly/page.js para reutilizarlo en cada landing
// rediseñada (bitácora, flota, SMS, etc.), en vez de que cada página cargue
// su propio <SEONav> del frontend viejo. Mismos destinos reales verificados
// contra el build (regla V1) — nada apunta a una página que no existe.

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Button } from '@skylog/ui';
import { FeatureIcon } from './icons';

const NAV_FUNCIONES_GROUPS = [
  {
    group: 'Operación',
    icon: 'operacion',
    items: [
      { icon: 'bitacora', href: '/bitacora-digital', label: 'Bitácora Digital', desc: 'Registro RAC 100 completo' },
      { icon: 'replay', href: '/replay-gps-drones', label: 'Replay GPS', desc: 'Reproduce el vuelo' },
      { icon: 'mapa', href: '/plan-vuelo-drones', label: 'Plan de Vuelo', desc: 'KMZ y polígonos' },
      { icon: 'clima', href: '/clima-drones', label: 'Clima UAV', desc: 'Verificación pre-vuelo' },
    ],
  },
  {
    group: 'Flota & Equipo',
    icon: 'flota',
    items: [
      { icon: 'flota', href: '/gestion-flota-drones', label: 'Gestión de Flota', desc: 'Drones y baterías' },
      { icon: 'mantenimiento', href: '/mantenimiento-drones', label: 'Mantenimiento', desc: 'Alertas y trazabilidad' },
    ],
  },
  {
    group: 'Documentación & Cumplimiento',
    icon: 'sms',
    items: [
      { icon: 'sms', href: '/sms-aeronautico', label: 'SMS Aeronáutico', desc: 'Seguridad operacional' },
      { icon: 'roles', href: '/gestion-pilotos', label: 'Pilotos', desc: 'Expediente y licencias' },
      { icon: 'capacitacion', href: '/capacitacion-drones', label: 'Capacitación', desc: 'Examen y bloqueo de despacho' },
      { icon: 'reportes', href: '/reportes-auditoria', label: 'Reportes', desc: 'PDFs RAC 100' },
    ],
  },
];

const NAV_RECURSOS_ITEMS = [
  { icon: 'replay', href: '/tutoriales', label: 'Tutoriales', desc: 'Videos paso a paso' },
  { icon: 'riesgo', href: '/rac-100', label: 'RAC 100', desc: 'Normativa AeroCivil' },
  { icon: 'reportes', href: '/documentacion', label: 'Documentación', desc: 'Guía de uso detallada' },
  { icon: 'sparkle', href: '/casos', label: 'Casos de éxito', desc: 'Resultados reales' },
  { icon: 'apps', href: '/comparativa-bitafly-airdata', label: 'Comparativas', desc: 'BitaFly vs competidores' },
];

function FuncionesMegaMenu({ onClose }) {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+8px)] z-50 w-[680px] bg-white rounded-2xl shadow-xl ring-1 ring-navy-100 overflow-hidden">
      <div className="bg-navy px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary-300">Módulos de BitaFly</p>
          <p className="text-white text-xs mt-0.5">Todo el cumplimiento RAC 100 en un solo lugar</p>
        </div>
        <a
          href="/registro"
          onClick={onClose}
          className="bg-primary text-white px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-primary-600 transition-colors shrink-0"
        >
          Probar gratis
        </a>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-px bg-navy-100 p-px">
        {NAV_FUNCIONES_GROUPS.flatMap((g) => g.items).map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="group flex flex-col gap-1.5 bg-white px-4 py-4 hover:bg-primary-50 transition-colors"
          >
            <FeatureIcon name={item.icon} className="w-5 h-5 text-primary-600" />
            <p className="text-xs font-bold text-navy group-hover:text-primary-700">{item.label}</p>
            <p className="text-[11px] text-navy-300">{item.desc}</p>
          </a>
        ))}
      </div>
      <div className="bg-navy-50 px-6 py-3 flex items-center justify-between border-t border-navy-100">
        <p className="text-[11px] text-navy-300">
          <span className="font-bold text-navy">11 módulos</span> · Cumplimiento RAC 100 completo
        </p>
        <a href="/#funciones" onClick={onClose} className="text-[11px] font-bold text-primary-600 hover:text-primary-700">
          Ver todas las funciones →
        </a>
      </div>
    </div>
  );
}

function RecursosDropdown({ onClose }) {
  return (
    <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 bg-white rounded-2xl shadow-xl ring-1 ring-navy-100 overflow-hidden p-2">
      {NAV_RECURSOS_ITEMS.map((item) => (
        <a
          key={item.href}
          href={item.href}
          onClick={onClose}
          className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-navy-50 transition-colors"
        >
          <span className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            <FeatureIcon name={item.icon} className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-navy group-hover:text-primary-700 truncate">{item.label}</p>
            <p className="text-[11px] text-navy-300 truncate">{item.desc}</p>
          </div>
        </a>
      ))}
    </div>
  );
}

export default function PublicHeader() {
  const navRef = useRef(null);
  const [openNavMenu, setOpenNavMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false); // menú hamburguesa (bajo lg)

  useEffect(() => {
    function handleClickOutside(e) {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenNavMenu(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header ref={navRef} className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-navy-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3 sm:gap-6">
        <a href="/" className="flex items-center gap-2 shrink-0 group">
          <Image
            src="/logo.png"
            alt=""
            width={36}
            height={36}
            className="h-8 w-auto transition-transform duration-200 group-hover:scale-105"
            priority
          />
          <span className="font-black text-navy tracking-tight">BitaFly</span>
        </a>

        <nav className="hidden lg:flex items-center gap-1 flex-1" aria-label="Navegación principal">
          <div className="relative">
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={openNavMenu === 'funciones'}
              onClick={() => setOpenNavMenu(openNavMenu === 'funciones' ? null : 'funciones')}
              className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-sm font-semibold text-navy-400 hover:text-navy hover:bg-navy-50 transition-colors"
            >
              Funciones
              <svg viewBox="0 0 24 24" className={`w-4 h-4 transition-transform ${openNavMenu === 'funciones' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {openNavMenu === 'funciones' && <FuncionesMegaMenu onClose={() => setOpenNavMenu(null)} />}
          </div>

          <a href="/precios" className="px-3.5 py-2 rounded-xl text-sm font-semibold text-navy-400 hover:text-navy hover:bg-navy-50 transition-colors">
            Precios
          </a>
          <a href="/blog" className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-navy-400 hover:text-navy hover:bg-navy-50 transition-colors">
            Blog
            <span className="bg-primary text-white text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full leading-none">Nuevo</span>
          </a>

          <div className="relative">
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={openNavMenu === 'recursos'}
              onClick={() => setOpenNavMenu(openNavMenu === 'recursos' ? null : 'recursos')}
              className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-sm font-semibold text-navy-400 hover:text-navy hover:bg-navy-50 transition-colors"
            >
              Recursos
              <svg viewBox="0 0 24 24" className={`w-4 h-4 transition-transform ${openNavMenu === 'recursos' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {openNavMenu === 'recursos' && <RecursosDropdown onClose={() => setOpenNavMenu(null)} />}
          </div>
        </nav>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <a href="/login" className="hidden sm:block">
            <Button variant="ghost">Iniciar sesión</Button>
          </a>
          <a href="/registro">
            <Button variant="primary" className="px-3 sm:px-4">Comenzar gratis</Button>
          </a>
          <button
            type="button"
            className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-navy-200 text-navy hover:bg-navy-50 transition-colors"
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileOpen}
            aria-controls="menu-movil"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div id="menu-movil" className="lg:hidden absolute left-0 right-0 top-full bg-white border-b border-navy-100 shadow-xl max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain px-4 py-3">
          <a href="/precios" onClick={() => setMobileOpen(false)} className="flex items-center min-h-[44px] px-3 rounded-xl text-sm font-bold text-navy hover:bg-navy-50">Precios</a>
          <a href="/blog" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 min-h-[44px] px-3 rounded-xl text-sm font-bold text-navy hover:bg-navy-50">
            Blog
            <span className="bg-primary text-white text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full leading-none">Nuevo</span>
          </a>
          {NAV_FUNCIONES_GROUPS.map((g) => (
            <div key={g.group} className="mt-2">
              <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-navy-300">{g.group}</p>
              {g.items.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="flex flex-col justify-center min-h-[44px] px-3 py-1.5 rounded-xl hover:bg-navy-50">
                  <span className="text-sm font-semibold text-navy">{item.label}</span>
                  <span className="text-[11px] text-navy-300">{item.desc}</span>
                </a>
              ))}
            </div>
          ))}
          <div className="mt-2">
            <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-navy-300">Recursos</p>
            {NAV_RECURSOS_ITEMS.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="flex flex-col justify-center min-h-[44px] px-3 py-1.5 rounded-xl hover:bg-navy-50">
                <span className="text-sm font-semibold text-navy">{item.label}</span>
                <span className="text-[11px] text-navy-300">{item.desc}</span>
              </a>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-navy-100">
            <a href="/login" onClick={() => setMobileOpen(false)} className="flex items-center justify-center min-h-[44px] rounded-xl border border-navy-200 text-sm font-semibold text-navy hover:bg-navy-50">Iniciar sesión</a>
          </div>
        </div>
      )}
    </header>
  );
}
