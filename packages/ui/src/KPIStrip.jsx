// KPIStrip — grilla grid-cols-2 md:grid-cols-4 de KPICard (35-frontend.md
// §3.4). Mismo contrato que producción: cada item { icon, label, value, trend? }.

export function KPICard({ label, value, trend }) {
  return (
    <div className="bg-white border border-navy-100 rounded-2xl p-4">
      <p className="text-xs text-navy-300">{label}</p>
      <p className="text-xl font-bold text-navy mt-1">{value}</p>
      {trend && <p className={`text-xs mt-1 ${trend.positive ? 'text-primary-600' : 'text-navy-400'}`}>{trend.label}</p>}
    </div>
  );
}

export function KPIStrip({ items, variant = 'grid' }) {
  const gridClass = variant === 'strip' ? 'grid grid-cols-2 md:grid-cols-4 gap-3' : 'grid grid-cols-2 md:grid-cols-4 gap-4';
  return (
    <div className={gridClass}>
      {items.map((item, i) => (
        <KPICard key={item.label || i} {...item} />
      ))}
    </div>
  );
}
