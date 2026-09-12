'use client';

// Panel — el patrón de "panel deslizable" ya establecido en producción y
// documentado literalmente en CLAUDE.md: mismas clases exactas, para que
// cualquier panel nuevo de V2 lo reutilice en vez de inventar uno paralelo
// (35-frontend.md §3.4).

export function Panel({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[299] bg-black/40" onClick={onClose}>
      <div
        className="fixed z-[300] inset-x-0 bottom-0 top-14 rounded-t-3xl md:inset-y-0 md:left-auto md:right-0 md:top-0 md:rounded-none md:w-[92vw] md:max-w-[640px] lg:max-w-[820px] bg-white flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-navy text-white px-4 py-3 flex items-center justify-between rounded-t-3xl md:rounded-none">
          <p className="font-semibold">{title}</p>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-white/80 hover:text-white">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <div className="sticky bottom-0 bg-white border-t border-navy-100 p-4">{footer}</div>}
      </div>
    </div>
  );
}
