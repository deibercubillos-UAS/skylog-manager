// Iconos de los 4 espacios de trabajo (F1 §3.2) — SVG inline, sin librería
// externa (35-frontend.md §3.4: "el look ya existe y es propio"). Trazo
// consistente (stroke, 1.75, redondeado) para que los 4 se vean como un set.

const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function IconOperar({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M2 16l7-2 4-7 2 .6-2.4 6.8 5.4-.4 2 2-7 2.6-3.4 4-3-1 1.4-3-3-1z" />
    </svg>
  );
}

export function IconPlanear({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconRegistrar({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 4h16v6H4zM4 14h16v6H4z" />
      <path d="M8 7h.01M8 17h.01" />
    </svg>
  );
}

export function IconCumplir({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export const WORKSPACE_ICONS = {
  operar: IconOperar,
  planear: IconPlanear,
  registrar: IconRegistrar,
  cumplir: IconCumplir,
};
