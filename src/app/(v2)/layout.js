'use client';

// Skylog V2.0 — F1 §3.2. Espacios de trabajo por momento operacional
// (OPERAR/PLANEAR/REGISTRAR/CUMPLIR), reemplazando la navegación por entidad
// de datos que causa el síntoma diagnosticado en 35-frontend.md §3.1 (páginas
// huérfanas, sidebar que crece por acumulación). El rol sigue filtrando qué
// se ve — aquí solo se organiza QUÉ YA EXISTE bajo su espacio real; no se
// fabrica ningún enlace a una página que V2 no ha construido todavía
// (REGISTRAR queda "Próximamente" — Flota/Bitácora/Mantenimiento no existen
// en V2 aún).

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { WORKSPACES } from '@skylog/domain';
import { WORKSPACE_ICONS } from '@skylog/ui';

// Cada entrada apunta a una página REAL ya construida y verificada — nunca
// una ruta especulativa. Ver docs/skylog-v2/51-bitacora.md por frente.
const WORKSPACE_LINKS = {
  operar: [{ href: '/duty', label: 'Tiempos de servicio', tag: 'F5' }],
  planear: [{ href: '/aerocivil', label: 'Expediente Aerocivil', tag: 'F4a' }],
  registrar: [], // Flota/Bitácora/Mantenimiento — sin construir todavía en V2
  cumplir: [
    { href: '/sms', label: 'Reportes y casos SMS', tag: 'F3' },
    { href: '/sms/asistente', label: 'Asistente de implantación', tag: 'F3' },
    { href: '/capacitacion', label: 'Capacitación y Examen', tag: 'F3' },
  ],
};

function workspaceForPath(pathname) {
  for (const [key, links] of Object.entries(WORKSPACE_LINKS)) {
    if (links.some((l) => pathname.startsWith(l.href))) return key;
  }
  return null;
}

export default function V2Layout({ children }) {
  const pathname = usePathname();
  const activeWorkspace = workspaceForPath(pathname);
  const [openKey, setOpenKey] = useState(null);
  const navRef = useRef(null);

  // Clic fuera del nav cierra cualquier menú abierto — más predecible que
  // depender solo de :hover (no funciona en táctil, modo campo es tablet/RC).
  useEffect(() => {
    function handleClickOutside(e) {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenKey(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-navy-50 font-sans">
      <nav ref={navRef} className="bg-navy/95 backdrop-blur text-white sticky top-0 z-40 border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap items-center gap-1 min-h-14 py-2">
          <a href="/inicio" className="flex items-center gap-2 mr-3 shrink-0 group">
            <span className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-sm font-black group-hover:bg-primary-400 transition-colors">
              S
            </span>
            <span className="font-bold text-sm tracking-wide hidden sm:inline">Skylog V2.0</span>
          </a>

          <div className="flex flex-wrap items-center gap-1">
            {WORKSPACES.map((w) => {
              const links = WORKSPACE_LINKS[w.key];
              const Icon = WORKSPACE_ICONS[w.key];
              const isActive = activeWorkspace === w.key;
              const isEmpty = links.length === 0;
              const isOpen = openKey === w.key;
              return (
                <div key={w.key} className="relative shrink-0">
                  <button
                    type="button"
                    disabled={isEmpty}
                    aria-expanded={isOpen}
                    onClick={() => !isEmpty && setOpenKey(isOpen ? null : w.key)}
                    className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-primary text-white shadow-sm shadow-primary-900/40'
                        : isEmpty
                          ? 'text-navy-400/70 cursor-not-allowed'
                          : isOpen
                            ? 'bg-white/10 text-white'
                            : 'text-navy-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {w.label}
                    {isEmpty ? (
                      <span className="text-[10px] font-normal opacity-70">· pronto</span>
                    ) : (
                      <svg viewBox="0 0 24 24" className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  {isOpen && (
                    <div className="absolute left-0 top-full mt-2 bg-white text-navy rounded-xl shadow-xl ring-1 ring-navy-100 py-1.5 min-w-[240px] z-50">
                      {links.map((l) => {
                        const isCurrent = pathname.startsWith(l.href);
                        return (
                          <a
                            key={l.href}
                            href={l.href}
                            onClick={() => setOpenKey(null)}
                            className={`flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-navy-50 ${isCurrent ? 'font-semibold text-primary-700' : ''}`}
                          >
                            {l.label}
                            <span className="text-[10px] text-navy-300 font-mono">{l.tag}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
