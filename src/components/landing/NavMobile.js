'use client';
import { useState } from 'react';
import Link from 'next/link';

const NAV_LINKS = [
  { href: '#funciones', label: 'Funciones' },
  { href: '#cumplimiento', label: 'RAC 100' },
  { href: '/documentacion', label: 'Guía de uso', isLink: true },
  { href: '#precios', label: 'Precios' },
  { href: '#faq', label: 'Preguntas' },
];

export default function NavMobile() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open}
      >
        <span className={`block h-0.5 w-5 bg-slate-700 transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`} />
        <span className={`block h-0.5 w-5 bg-slate-700 transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
        <span className={`block h-0.5 w-5 bg-slate-700 transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
      </button>

      {open && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-slate-100 shadow-lg z-50">
          <nav className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((l) =>
              l.isLink ? (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="py-3 text-sm font-bold text-primary hover:text-orange-600 border-b border-slate-50 last:border-0 transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">menu_book</span>
                  {l.label}
                </Link>
              ) : (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="py-3 text-sm font-bold text-slate-700 hover:text-primary border-b border-slate-50 last:border-0 transition-colors"
                >
                  {l.label}
                </a>
              )
            )}
            <div className="flex flex-col gap-2 pt-3 pb-1">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="text-center py-3 text-sm font-black uppercase tracking-widest text-slate-600 border border-slate-200 rounded-xl hover:border-navy transition-colors"
              >
                Ingresar
              </Link>
              <Link
                href="/registro"
                onClick={() => setOpen(false)}
                className="text-center py-3 text-sm font-black uppercase tracking-widest text-white bg-primary rounded-xl hover:bg-orange-600 transition-colors"
              >
                Comenzar gratis
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
