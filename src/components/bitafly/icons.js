// Sistema de íconos compartido del nuevo frontend público de BitaFly (F1).
// Extraído de src/app/preview-bitafly/page.js para que cada landing rediseñada
// (bitácora, flota, SMS, etc.) use exactamente el mismo trazo — nunca Material
// Symbols ni emojis, que es el lenguaje del frontend viejo (SEO* components).

export const ICON_STROKE = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const FEATURE_ICONS = {
  operacion: (p) => <path d="M2 16l7-2 4-7 2 .6-2.4 6.8 5.4-.4 2 2-7 2.6-3.4 4-3-1 1.4-3-3-1z" {...p} />,
  bitacora: (p) => (
    <>
      <path d="M6 4h11a1 1 0 011 1v14a1 1 0 01-1 1H8a2 2 0 01-2-2V4z" {...p} />
      <path d="M9 8h6M9 12h6M9 16h3" {...p} />
    </>
  ),
  riesgo: (p) => (
    <>
      <path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z" {...p} />
      <path d="M9 12l2 2 4-4" {...p} />
    </>
  ),
  replay: (p) => (
    <>
      <circle cx="12" cy="12" r="8.5" {...p} />
      <path d="M10 9l5 3-5 3z" {...p} />
    </>
  ),
  flota: (p) => (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" {...p} />
      <path d="M3 10h18M8 3v4M16 3v4" {...p} />
    </>
  ),
  mantenimiento: (p) => (
    <path d="M14.7 6.3a4 4 0 00-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 005.4-5.4l-2.6 2.6-2-2z" {...p} />
  ),
  bateria: (p) => (
    <>
      <rect x="3" y="8" width="16" height="9" rx="1.5" {...p} />
      <path d="M20 11v3" {...p} />
      <path d="M7 12h2M11 12h2" {...p} />
    </>
  ),
  sms: (p) => (
    <>
      <path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z" {...p} />
      <path d="M12 8v5M12 16h.01" {...p} />
    </>
  ),
  capacitacion: (p) => (
    <>
      <path d="M2 8l10-4 10 4-10 4-10-4z" {...p} />
      <path d="M6 10.5V15c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5" {...p} />
    </>
  ),
  reportes: (p) => (
    <>
      <path d="M6 4h9l3 3v13a1 1 0 01-1 1H6a1 1 0 01-1-1V5a1 1 0 011-1z" {...p} />
      <path d="M9 12h6M9 16h6M9 8h3" {...p} />
    </>
  ),
  roles: (p) => (
    <>
      <circle cx="9" cy="8" r="3" {...p} />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" {...p} />
      <circle cx="18" cy="8.5" r="2.2" {...p} />
      <path d="M15.5 14.2c2.4.5 4.5 2.5 4.5 5.8" {...p} />
    </>
  ),
  nube: (p) => <path d="M7 18a4 4 0 01-1-7.9 5 5 0 019.6-1.7A4.5 4.5 0 0117.5 18H7z" {...p} />,
  bolt: (p) => <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" {...p} />,
  apps: (p) => (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" {...p} />
      <rect x="14" y="4" width="6" height="6" rx="1" {...p} />
      <rect x="4" y="14" width="6" height="6" rx="1" {...p} />
      <rect x="14" y="14" width="6" height="6" rx="1" {...p} />
    </>
  ),
  sparkle: (p) => (
    <>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" {...p} />
      <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" {...p} />
    </>
  ),
  lock: (p) => (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" {...p} />
      <path d="M8 11V7a4 4 0 018 0v4" {...p} />
    </>
  ),
  radar: (p) => (
    <>
      <circle cx="12" cy="12" r="9" {...p} />
      <circle cx="12" cy="12" r="4.5" {...p} />
      <path d="M12 12L12 3" {...p} />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  mapa: (p) => (
    <>
      <path d="M12 21s7-7.4 7-12a7 7 0 10-14 0c0 4.6 7 12 7 12z" {...p} />
      <circle cx="12" cy="9" r="2.3" {...p} />
    </>
  ),
  clima: (p) => (
    <>
      <circle cx="7.5" cy="7" r="2.8" {...p} />
      <path d="M8 17a4 4 0 01-1-7.9 5 5 0 019.6-1.7A4.5 4.5 0 0117.5 17H8z" {...p} />
    </>
  ),
  timer: (p) => (
    <>
      <circle cx="12" cy="13" r="8" {...p} />
      <path d="M12 9v4l3 2M10 2h4" {...p} />
    </>
  ),
  persona: (p) => (
    <>
      <circle cx="12" cy="8" r="4" {...p} />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" {...p} />
    </>
  ),
};

export function FeatureIcon({ name, className }) {
  const render = FEATURE_ICONS[name];
  if (!render) return null;
  return (
    <svg viewBox="0 0 24 24" className={className}>
      {render(ICON_STROKE)}
    </svg>
  );
}
