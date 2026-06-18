/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/**/*.{js,jsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Marca BitaFly (base). El white-label del cliente se sobreescribe
        // por variables CSS en globals.css (--brand-accent / --brand-navy).
        primary: 'var(--brand-accent)',
        navy: 'var(--brand-navy)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
