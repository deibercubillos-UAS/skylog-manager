// PageHero — banner navy redondeado, encabezado estándar de página
// (35-frontend.md §3.4). Props documentadas en CLAUDE.md de producción:
// { eyebrow, title, description, metric, cta } — mismo contrato, para que
// adoptar este componente en una página ya escrita no cambie su forma de uso.

export function PageHero({ eyebrow, title, description, metric, cta }) {
  return (
    <div className="bg-navy text-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wide text-primary-300">{eyebrow}</p>}
        <h1 className="text-xl md:text-2xl font-bold mt-1">{title}</h1>
        {description && <p className="text-sm text-navy-200 mt-1 max-w-xl">{description}</p>}
      </div>
      <div className="flex items-center gap-4">
        {metric && (
          <div className="text-right">
            <p className="text-2xl font-bold">{metric.value}</p>
            <p className="text-xs text-navy-300">{metric.label}</p>
          </div>
        )}
        {cta}
      </div>
    </div>
  );
}
