'use client';

import { memo } from 'react';

/**
 * Tarjeta individual de indicador clave (KPI). Extraída del componente
 * KPICard que hoy vive inline en src/app/dashboard/DashboardClient.js,
 * sin cambios de comportamiento — mismo markup, mismas props.
 *
 * Se exporta también suelta por si algún módulo necesita una sola tarjeta
 * fuera de la grilla de KPIStrip.
 */
function KPICardBase({ title, value, icon, warning, color, trend, hero, sub, className }) {
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

// Props de KPICard/KPIStripItem son primitivas (strings/numbers/booleans) — se
// comparan por valor en el shallow-compare de React.memo, así que memoizar es
// efectivo aunque el `items` array del llamador se reconstruya cada render.
export const KPICard = memo(KPICardBase);

/**
 * Ítem individual de la variante "strip" (franja sin cajas, separadores
 * verticales) — patrón del mockup Dashboard Layout 1a. Distinto shape que
 * KPICard: delta como pill de texto libre (no un % de trend), color de
 * ícono por ítem.
 *
 * item: { icon, iconColor?, label, value, unit?, delta?, deltaTone: 'positive'|'neutral' }
 */
const KPIStripItem = memo(function KPIStripItem({ icon, iconColor, label, value, unit, delta, deltaTone }) {
  return (
    <div className="flex-1 px-4 md:px-6 border-l border-slate-200 first:border-l-0 sm:first:border-l">
      <div className="flex items-center gap-1.5">
        <span className="material-symbols-outlined text-base" style={{ color: iconColor || '#94a3b8' }} aria-hidden="true">{icon}</span>
        <span className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>
      </div>
      <div className="flex items-baseline gap-1 mt-2">
        <span className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 tabular-nums">{value}</span>
        {unit && <span className="text-xs font-bold text-slate-400">{unit}</span>}
      </div>
      {delta && (
        <div className={`inline-flex text-xs font-black rounded-full px-2 py-0.5 mt-2 ${
          deltaTone === 'positive' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'
        }`}>
          {delta}
        </div>
      )}
    </div>
  );
});

/**
 * Grilla de KPICard reutilizable — mismo layout (grid-cols-2 md:grid-cols-4)
 * que hoy arma DashboardClient.js a mano. Cada módulo (Fase 3/4 del plan)
 * pasa su propia lista de `items` con las props de KPICard.
 *
 * items: Array<{ key?, title, value, icon, warning?, color?, trend?, hero?, sub? }>
 *
 * variant: 'card' (default, tarjetas con sombra) | 'strip' (franja sin cajas,
 * usa KPIStripItem — solo el Dashboard la usa, por fidelidad al mockup 1a).
 */
export default function KPIStrip({ items = [], className, variant = 'card' }) {
  if (variant === 'strip') {
    return (
      <div className={`flex flex-wrap sm:flex-nowrap ${className || ''}`}>
        {items.map((item, i) => (
          <KPIStripItem key={item.key ?? i} {...item} />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 ${className || ''}`}>
      {items.map((item, i) => (
        <KPICard key={item.key ?? i} {...item} />
      ))}
    </div>
  );
}
