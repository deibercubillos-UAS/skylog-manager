'use client';

/**
 * Tile de icono reutilizable (patrón "icon-tile" del sistema de diseño):
 * 64px por defecto, radio 18px, fondo naranja tenue con el ícono en color
 * primario. Sin consumidores todavía — se adopta módulo por módulo al
 * restylear tarjetas (AircraftCard, BatteryCard, etc.) en la Fase 3/4.
 *
 * variant: 'default' (naranja tenue) | 'navy' (fondo navy) | 'solid' (naranja sólido)
 */
const VARIANTS = {
  default: 'bg-orange-50 text-orange-600',
  navy: 'bg-[#1A202C] text-white',
  solid: 'bg-orange-600 text-white',
};

export default function IconTile({ icon, variant = 'default', size = 64, className }) {
  return (
    <div
      className={`shrink-0 rounded-[18px] flex items-center justify-center ${VARIANTS[variant] || VARIANTS.default} ${className || ''}`}
      style={{ width: size, height: size }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: Math.round(size / 2) }}>
        {icon}
      </span>
    </div>
  );
}
