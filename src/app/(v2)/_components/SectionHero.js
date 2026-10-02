// Skylog V2.0 — piezas visuales compartidas del lenguaje "moderno" de V2
// (degradado navy + tarjetas de color), usadas por Inicio/Bitácora/
// Programación y cualquier página nueva de sección — para no repetir el
// mismo marcado en cada página. Carpeta con `_` — no crea segmento de ruta.

export function SectionHero({ eyebrow, title, description, metric, cta }) {
  return (
    <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy to-[#0f1420] text-white p-6 md:p-7 shadow-lg shadow-navy-900/20">
      <div className="absolute -right-14 -top-16 w-56 h-56 rounded-full bg-primary/30 blur-3xl -z-10" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {eyebrow && <p className="text-xs font-bold uppercase tracking-widest text-primary-300">{eyebrow}</p>}
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1 text-white">{title}</h1>
          {description && <p className="text-sm text-navy-300 mt-1.5 max-w-xl">{description}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {metric && (
            <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 px-5 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-navy-300">{metric.label}</p>
              <p className="text-2xl font-black text-white mt-0.5 leading-none">{metric.value}</p>
            </div>
          )}
          {cta}
        </div>
      </div>
    </div>
  );
}

// SectionCard — tarjeta de sección con encabezado de ícono+color (antes
// vivía solo en `perfil/page.js`); se promueve aquí al volverse a necesitar
// en Gobernanza SMS (política/GSO) — segunda vez que se repite es la señal
// de sacarla del archivo local, no antes.
export function SectionCard({ icon, tile, wash, title, description, badge, children }) {
  return (
    <div className={`rounded-2xl border border-navy-100 bg-gradient-to-br ${wash} overflow-hidden`}>
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-navy-50">
        <div className="flex items-center gap-3">
          <span className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 shadow-sm ${tile}`}>
            <span className="material-symbols-outlined text-xl">{icon}</span>
          </span>
          <div>
            <p className="text-sm font-bold text-navy">{title}</p>
            {description && <p className="text-xs text-navy-400">{description}</p>}
          </div>
        </div>
        {badge}
      </div>
      <div className="p-5 bg-white/60">{children}</div>
    </div>
  );
}

export function StatCard({ icon, color, label, value, sub }) {
  const palette = {
    primary: { wash: 'from-primary-50 to-white', tile: 'bg-primary text-white' },
    blue: { wash: 'from-blue-50 to-white', tile: 'bg-blue-500 text-white' },
    violet: { wash: 'from-violet-50 to-white', tile: 'bg-violet-500 text-white' },
    emerald: { wash: 'from-emerald-50 to-white', tile: 'bg-emerald-500 text-white' },
    amber: { wash: 'from-amber-50 to-white', tile: 'bg-amber-500 text-white' },
    red: { wash: 'from-red-50 to-white', tile: 'bg-red-500 text-white' },
  }[color] || { wash: 'from-navy-50 to-white', tile: 'bg-navy text-white' };
  return (
    <div className={`bg-gradient-to-br ${palette.wash} border border-navy-100 rounded-2xl p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${palette.tile}`}>
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-navy-400 font-medium truncate">{label}</p>
        <p className="text-2xl font-black text-navy leading-tight tracking-tight">{value}</p>
      </div>
      {sub && <p className="text-[11px] text-navy-300 mt-2">{sub}</p>}
    </div>
  );
}
