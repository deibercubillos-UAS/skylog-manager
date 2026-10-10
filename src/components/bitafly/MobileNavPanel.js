'use client';

// Panel del menú hamburguesa de las páginas públicas (bajo lg). Compacto a propósito: tres filas principales —Funciones,
// Precios, Blog, Recursos— y solo «Funciones» y «Recursos» se despliegan (acordeón, uno a la vez). Así el menú cabe en
// pantalla sin desplazarse y quien lo abre ve de entrada todas las secciones.
import { useState } from 'react';

export default function MobileNavPanel({ groups, recursos, onClose }) {
  const [open, setOpen] = useState(null); // 'funciones' | 'recursos' | null
  const toggle = (k) => setOpen((v) => (v === k ? null : k));
  const funciones = groups.flatMap((g) => g.items);

  const Chevron = ({ up }) => (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 shrink-0 transition-transform ${up ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
  const rowCls = 'flex items-center justify-between w-full min-h-[48px] px-3 rounded-xl text-sm font-bold text-navy hover:bg-navy-50 text-left';

  return (
    <div id="menu-movil" className="lg:hidden absolute left-0 right-0 top-full bg-white border-b border-navy-100 shadow-xl max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain px-4 py-2">
      <button type="button" className={rowCls} aria-expanded={open === 'funciones'} aria-controls="menu-movil-funciones" onClick={() => toggle('funciones')}>
        Funciones <Chevron up={open === 'funciones'} />
      </button>
      {open === 'funciones' && (
        <div id="menu-movil-funciones" className="grid grid-cols-2 gap-1 pb-2 px-1">
          {funciones.map((item) => (
            <a key={item.href} href={item.href} onClick={onClose} className="flex items-center min-h-[44px] px-3 rounded-lg bg-navy-50/60 text-[13px] font-semibold text-navy hover:bg-primary-50">
              {item.label}
            </a>
          ))}
        </div>
      )}

      <a href="/precios" onClick={onClose} className={rowCls}>Precios</a>
      <a href="/blog" onClick={onClose} className={rowCls}>
        <span className="flex items-center gap-2">
          Blog
          <span className="bg-primary text-white text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full leading-none">Nuevo</span>
        </span>
      </a>

      <button type="button" className={rowCls} aria-expanded={open === 'recursos'} aria-controls="menu-movil-recursos" onClick={() => toggle('recursos')}>
        Recursos <Chevron up={open === 'recursos'} />
      </button>
      {open === 'recursos' && (
        <div id="menu-movil-recursos" className="grid grid-cols-1 gap-1 pb-2 px-1">
          {recursos.map((item) => (
            <a key={item.href} href={item.href} onClick={onClose} className="flex items-center justify-between min-h-[44px] px-3 rounded-lg bg-navy-50/60 hover:bg-primary-50">
              <span className="text-[13px] font-semibold text-navy">{item.label}</span>
              <span className="text-[11px] text-navy-300">{item.desc}</span>
            </a>
          ))}
        </div>
      )}

      <div className="mt-1 pt-2 border-t border-navy-100">
        <a href="/login" onClick={onClose} className="flex items-center justify-center min-h-[44px] rounded-xl border border-navy-200 text-sm font-semibold text-navy hover:bg-navy-50">Iniciar sesión</a>
      </div>
    </div>
  );
}
