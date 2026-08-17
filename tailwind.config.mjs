/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Escalas tonales de los 2 colores de marca — antes solo existía el
        // valor plano (`primary`/`navy`), obligando a cualquier variación a
        // caer en la escala genérica `orange-*`/`slate-*` de Tailwind. `DEFAULT`
        // conserva el uso ya existente en toda la app (`bg-primary`, `text-navy`,
        // etc.) — nada se rompe, solo se agregan los tonos `-50` a `-900`.
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
        // Acento secundario nuevo — "azul cielo" (temática de aviación), para
        // dar variedad cromática deliberada en vez de repetir siempre
        // navy+naranja en cada sección de cada página pública. Uso previsto:
        // una de las "familias de composición" de sección (ver Fase 1 del
        // plan `docs/plan-mejora-visual-landing-bitafly.md`), nunca como
        // reemplazo del naranja de marca en CTAs/acciones primarias.
        sky: {
          50: '#eaf5fb', 100: '#cce8f5', 200: '#99d1eb', 300: '#5ab3db',
          400: '#2f97c8', DEFAULT: '#1d7fbf', 500: '#1d7fbf', 600: '#16639a',
          700: '#124f7d', 800: '#103f63', 900: '#0f3552',
        },
      },
      fontFamily: {
        // Esto vincula la variable de layout.js con Tailwind
        sans:   ['var(--font-public-sans)', 'sans-serif'],
        lexend: ['var(--font-lexend)', 'var(--font-public-sans)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;