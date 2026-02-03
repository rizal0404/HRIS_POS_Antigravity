/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#f9f506",
        "background-light": "#f8f8f5",
        "background-dark": "#23220f",
        "surface-light": "#ffffff",
        "surface-dark": "#2c2b18",
        "text-main-light": "#181811",
        "text-main-dark": "#f2f2f0",
        "text-sub-light": "#8c8b5f",
        "text-sub-dark": "#a3a299",
      },
      fontFamily: {
        "display": ["Spline Sans", "sans-serif"],
        "body": ["Noto Sans", "sans-serif"],
      },
      borderRadius: { "DEFAULT": "1rem", "lg": "1.5rem", "xl": "2rem", "2xl": "2.5rem", "full": "9999px" },
    },
  },
  plugins: [],
}
