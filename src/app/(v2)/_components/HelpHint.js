'use client';

// Skylog V2.0 — pequeño círculo "?" con una explicación emergente. Para guiar
// pasos que no son evidentes (cómo se agrega una aeronave, cómo elegir/crear un
// modelo…) sin llenar la pantalla de texto. Se abre al tocar (sirve en celular),
// se cierra al tocar fuera o con Escape. Accesible: botón con aria-label y el
// panel con role="tooltip".
import { useEffect, useRef, useState } from 'react';

export default function HelpHint({ title, children, label = 'Ayuda', align = 'left' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        className="inline-flex items-center justify-center size-4 shrink-0 rounded-full bg-navy-100 text-navy-500 text-[11px] font-black leading-none hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-300 transition-colors"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute top-6 z-50 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-navy-100 bg-white p-3 text-left shadow-lg shadow-navy-900/10 normal-case ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {title && <span className="block text-xs font-black text-navy mb-1">{title}</span>}
          <span className="block text-[11px] leading-relaxed font-medium text-navy-500 [&_b]:font-bold [&_b]:text-navy">{children}</span>
        </span>
      )}
    </span>
  );
}
