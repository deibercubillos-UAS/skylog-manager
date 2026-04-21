/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#ec5b13',
        navy: '#1A202C',
      },
      fontFamily: {
        // Esto vincula la variable de layout.js con Tailwind
        sans: ['var(--font-public-sans)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;