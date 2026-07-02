'use client';
import Link from 'next/link';

/**
 * Banner navy reutilizable para el encabezado de cada página del dashboard.
 * Reemplaza, módulo por módulo (Fase 3 del plan de rediseño), los <header>
 * simples que hoy tiene cada página.
 *
 * Props:
 * - eyebrow: string — nombre del grupo del módulo (ej. "Flota & Equipo")
 * - title: string — título de la página (ej. "Mi Flota")
 * - description: string — subtítulo corto
 * - metric: { label, value, unit } — métrica rápida a la derecha (opcional)
 * - cta: { label, href, icon } — botón de acción primaria a la derecha (opcional)
 * - right: ReactNode — slot libre a la derecha para contenido custom (ej. anillo de
 *   progreso, varios bloques de métrica). Se ignora metric/cta si se pasa este slot.
 */
export default function PageHero({ eyebrow, title, description, metric, cta, right }) {
  return (
    <div className="rounded-[2rem] bg-[#1A202C] text-white px-6 py-6 md:px-10 md:py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400 mb-2">{eyebrow}</p>
        )}
        <h1 className="text-xl md:text-3xl font-black uppercase tracking-tight leading-none">{title}</h1>
        {description && (
          <p className="text-sm text-white/60 font-medium mt-2 max-w-xl">{description}</p>
        )}
      </div>

      {right ? (
        <div className="flex items-center gap-4 md:gap-6 shrink-0">{right}</div>
      ) : (metric || cta) && (
        <div className="flex items-center gap-4 md:gap-6 shrink-0">
          {metric && (
            <div className="text-right">
              {metric.label && (
                <p className="text-xs font-black uppercase tracking-wide text-white/40">{metric.label}</p>
              )}
              <p className="text-xl md:text-2xl font-black tabular-nums">
                {metric.value}
                {metric.unit && <span className="text-sm font-bold text-white/50 ml-1">{metric.unit}</span>}
              </p>
            </div>
          )}
          {cta && (
            <Link
              href={cta.href}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 transition-all active:scale-95 shrink-0"
            >
              {cta.icon && <span className="material-symbols-outlined text-base">{cta.icon}</span>}
              {cta.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
