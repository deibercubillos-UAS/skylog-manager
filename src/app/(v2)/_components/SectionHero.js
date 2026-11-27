// Skylog V2.0 — piezas visuales compartidas del lenguaje "moderno" de V2
// (degradado navy + tarjetas de color), usadas por Inicio/Bitácora/
// Programación y cualquier página nueva de sección — para no repetir el
// mismo marcado en cada página. Carpeta con `_` — no crea segmento de ruta.

export function SectionHero({ eyebrow, title, description, metric, cta }) {
  return (
    <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy to-[#0f1420] text-white p-6 md:p-7 shadow-lg shadow-navy-900/20">
      {/* textura sutil: retícula de puntos sobre el degradado navy (marca V2) */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.07]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }}
        aria-hidden="true"
      />
      <div className="absolute -right-14 -top-16 w-56 h-56 rounded-full bg-primary/30 blur-3xl -z-10" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {eyebrow && <p className="text-xs font-bold uppercase tracking-widest text-primary-300">{eyebrow}</p>}
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1 text-white">{title}</h1>
          {description && <p className="text-sm text-navy-300 mt-1.5 max-w-xl">{description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3 max-w-full">
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
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-navy-50">
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

// Sobria y monocroma (decisión 2026-11-26): etiqueta con ícono tenue arriba, valor en navy
// debajo — sin tiles de color. La etiqueta sube encima del valor para que no se desborde en
// celdas angostas de celular. El prop `color` se acepta pero se ignora (compatibilidad con
// quien aún lo pase). `alert` es el único acento: cuando el dato está fuera de su umbral
// objetivo la tarjeta pasa a un rojo suave (borde, ícono, valor y sub) — marca el dato, no
// emite un veredicto de vuelo.
export function StatCard({ icon, label, value, sub, alert = false }) {
  return (
    <div className={`border rounded-2xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${alert ? 'bg-red-50/60 border-red-200' : 'bg-white border-navy-100'}`}>
      <div className={`flex items-start gap-1.5 ${alert ? 'text-red-500' : 'text-navy-400'}`}>
        {icon && <span className="material-symbols-outlined text-base shrink-0">{icon}</span>}
        <p className="text-[11px] font-bold uppercase tracking-wide leading-tight line-clamp-2">{label}</p>
      </div>
      <p className={`${typeof value === 'string' && value.length > 9 ? 'text-xl' : 'text-2xl'} font-black leading-tight tracking-tight tabular-nums break-words mt-1.5 ${alert ? 'text-red-700' : 'text-navy'}`}>{value}</p>
      {sub && <p className={`text-[11px] mt-2 leading-snug ${alert ? 'text-red-600' : 'text-navy-500'}`}>{sub}</p>}
    </div>
  );
}
