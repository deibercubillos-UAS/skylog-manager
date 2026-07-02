'use client';

/**
 * Tarjeta individual de indicador clave (KPI). Extraída del componente
 * KPICard que hoy vive inline en src/app/dashboard/DashboardClient.js,
 * sin cambios de comportamiento — mismo markup, mismas props.
 *
 * Se exporta también suelta por si algún módulo necesita una sola tarjeta
 * fuera de la grilla de KPIStrip.
 */
export function KPICard({ title, value, icon, warning, color, trend, hero, sub, className }) {
  const trendLabel = trend !== null && trend !== undefined
    ? `${trend >= 0 ? 'Subió' : 'Bajó'} ${Math.abs(trend)}% vs mes anterior`
    : null;

  return (
    <div className={`bg-white p-4 md:p-8 rounded-2xl md:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:-translate-y-1 ${warning ? 'ring-2 ring-red-500/30 bg-red-50/5' : ''} ${className || ''}`}
      role="region"
      aria-label={`${title}: ${value}${trendLabel ? `. ${trendLabel}` : ''}${sub ? `. ${sub}` : ''}`}>
      <div className="flex justify-between items-start mb-3 md:mb-4">
        <span className="text-xs font-black uppercase text-slate-400 tracking-wide leading-tight max-w-[80%]">{title}</span>
        <span className={`material-symbols-outlined text-xl ${warning ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}
          aria-hidden="true">{icon}</span>
      </div>
      <span className={`${hero ? 'text-3xl md:text-5xl' : 'text-2xl md:text-4xl'} font-black tracking-tighter ${warning ? 'text-red-600' : color}`}
        aria-hidden="true">
        {value ?? 0}
      </span>
      {trend !== null && trend !== undefined && (
        <span className={`mt-1.5 text-xs font-black flex items-center gap-1 ${trend >= 0 ? 'text-emerald-500' : 'text-red-400'}`}
          aria-hidden="true">
          <span className="material-symbols-outlined text-sm" aria-hidden="true">
            {trend >= 0 ? 'trending_up' : 'trending_down'}
          </span>
          {trend >= 0 ? '+' : ''}{trend}% vs mes ant.
        </span>
      )}
      {sub && !trend && (
        <span className={`mt-1.5 text-xs font-bold ${warning ? 'text-red-400' : 'text-slate-400'}`} aria-hidden="true">
          {sub}
        </span>
      )}
    </div>
  );
}

/**
 * Grilla de KPICard reutilizable — mismo layout (grid-cols-2 md:grid-cols-4)
 * que hoy arma DashboardClient.js a mano. Cada módulo (Fase 3/4 del plan)
 * pasa su propia lista de `items` con las props de KPICard.
 *
 * items: Array<{ key?, title, value, icon, warning?, color?, trend?, hero?, sub? }>
 */
export default function KPIStrip({ items = [], className }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 ${className || ''}`}>
      {items.map((item, i) => (
        <KPICard key={item.key ?? i} {...item} />
      ))}
    </div>
  );
}
