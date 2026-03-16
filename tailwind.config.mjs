/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // Esto asegura que busque en todas las subcarpetas de src
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#ec5b13",
        "background-light": "#f8f6f6",
        "background-dark": "#221610",
        "navy": "#1A202C",
      },
      fontFamily: {
        "display": ["Public Sans", "sans-serif"]
      }
    },
  },
  plugins: [],
};
export default config;