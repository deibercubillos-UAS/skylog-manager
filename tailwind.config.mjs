/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#ec5b13",
        "background-light": "#f8f6f6",
        "background-dark": "#221610",
        "navy": "#1A202C",
        "slate-custom": "#4A5568"
      },
      fontFamily: {
        "display": ["Public Sans", "sans-serif"]
      },
    },
  },
  plugins: [],
};
export default config;