'use client';

// Panel — ventana lateral (escritorio) / hoja inferior (móvil) compartida por V2
// (SMS, Manuales, …). Un solo patrón, reutilizado en vez de inventar uno por
// pantalla (35-frontend.md §3.4).
//
// Encabezado con el lenguaje de marca de BitaFly: degradado navy + brillo
// primary, como SectionHero — ya no una barra plana. Layout en columna flex:
// encabezado (fijo), cuerpo con scroll y pie (fijo); por construcción NUNCA se
// solapan (el título no puede tapar los campos). Respeta el safe-area (notch
// arriba, barra de gestos abajo), clave en la app móvil (Capacitor).
//
// API retrocompatible: { open, onClose, title, children, footer }. Props nuevas
// opcionales: { eyebrow, subtitle, icon } (icono = símbolo de Material).

export function Panel({ open, onClose, title, eyebrow, subtitle, icon, children, footer }) {
  if (!open) return null;
  return (
    <div
      className="panel-overlay fixed inset-0 z-[299] bg-navy-900/60 backdrop-blur-sm flex flex-col justify-end md:flex-row md:justify-end"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        onClick={(e) => e.stopPropagation()}
        className="panel-sheet relative z-[300] flex flex-col w-full bg-white shadow-2xl
                   max-h-[92dvh] rounded-t-3xl
                   md:h-full md:max-h-none md:w-[92vw] md:max-w-[640px] lg:max-w-[820px] md:rounded-none"
      >
        {/* Asa — pista de "desliza para cerrar" en móvil */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="h-1.5 w-10 rounded-full bg-navy-200" />
        </div>

        {/* Encabezado con personalidad de marca (degradado navy + brillo primary) */}
        <header className="relative isolate overflow-hidden shrink-0 bg-gradient-to-br from-navy via-navy to-[#0f1420] text-white px-5 py-4">
          <div className="absolute -right-10 -top-14 w-44 h-44 rounded-full bg-primary/30 blur-3xl -z-10" aria-hidden="true" />
          <div className="flex items-start gap-3">
            {icon && (
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 border border-white/15 shrink-0">
                <span className="material-symbols-outlined text-xl text-primary-200">{icon}</span>
              </span>
            )}
            <div className="min-w-0 flex-1 pt-0.5">
              {eyebrow && <p className="text-[11px] font-bold uppercase tracking-widest text-primary-300 leading-none mb-1">{eyebrow}</p>}
              <h2 className="font-black tracking-tight leading-tight text-lg">{title}</h2>
              {subtitle && <p className="text-xs text-navy-300 mt-1">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="shrink-0 -mr-1.5 -mt-1 size-9 flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>
        </header>

        {/* Cuerpo desplazable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 bg-navy-50/20">{children}</div>

        {/* Pie opcional, pegado abajo; respeta el safe-area de la barra de gestos */}
        {footer && (
          <div
            className="shrink-0 bg-white/95 backdrop-blur border-t border-navy-100 px-5 py-4"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
