// Tokens de diseño de Skylog V2.0 — F1 §3.4 (35-frontend.md): "codificar el
// look que ya existe y es propio, no reemplazarlo". Los valores de color son
// los MISMOS verificados en `tailwind.config.mjs` de este mismo repo (marca
// real BitaFly/Skylog: naranja `#ec5b13`, navy `#1A202C`) — no se fabricó
// ninguna paleta nueva. Este archivo es la fuente única para cualquier
// componente de packages/ui/src; tailwind.config.mjs sigue siendo la fuente
// que Tailwind necesita en su propio formato (JIT no puede leer JS externo
// para generar clases), así que los valores se duplican a propósito en los
// dos lugares — mantenerlos sincronizados si alguno cambia.

export const colors = {
  primary: {
    50: '#fef3ec', 100: '#fde3d0', 200: '#fac7a1', 300: '#f7a066',
    400: '#f37f3d', DEFAULT: '#ec5b13', 500: '#ec5b13', 600: '#d14a0d',
    700: '#ad3a0c', 800: '#8a2f10', 900: '#702810',
  },
  navy: {
    50: '#f4f5f7', 100: '#e6e8ec', 200: '#c9cdd6', 300: '#a3aab8',
    400: '#6b7385', 500: '#434b5c', 600: '#2e3644', 700: '#232a37',
    DEFAULT: '#1A202C', 800: '#1A202C', 900: '#12161e',
  },
  sky: {
    50: '#eaf5fb', 100: '#cce8f5', 200: '#99d1eb', 300: '#5ab3db',
    400: '#2f97c8', DEFAULT: '#1d7fbf', 500: '#1d7fbf', 600: '#16639a',
    700: '#124f7d', 800: '#103f63', 900: '#0f3552',
  },
};

// Radios ya verificados en CLAUDE.md (IconTile 18px, panel deslizable
// rounded-t-3xl/rounded-none) — nombrados por uso, no por valor crudo, para
// que un cambio de sistema no obligue a re-nombrar cada consumidor.
export const radii = {
  tile: '18px',
  card: '16px',
  panel: '24px',
};

// Umbral de "modo campo" (35-frontend.md §3.3): tipografía +30%, targets
// mínimos 56px — constantes, no una convención repetida a mano por página.
export const fieldMode = {
  fontScale: 1.3,
  minTargetPx: 56,
};

export const tokens = { colors, radii, fieldMode };
