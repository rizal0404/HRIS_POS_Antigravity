
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#135bec",
        "primary-hover": "#1d4ed8",
        "primary-dark": "#3b82f6",
        "primary-dark-hover": "#60a5fa",
        "background-light": "#f6f6f8",
        "background-dark": "#0f172a",
        "surface-light": "#ffffff",
        "surface-dark": "#1e293b",
        "surface-elevated-dark": "#334155",
        "text-main": "#111318",
        "text-main-dark": "#f1f5f9",
        "text-secondary": "#616f89",
        "text-secondary-dark": "#94a3b8",
        "border-light": "#f0f2f4",
        "border-dark": "#334155",
      },
      fontFamily: {
        "display": ["Manrope", "sans-serif"],
        "sans": ["Manrope", "sans-serif"],
      },
      borderRadius: {
        "xl": "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
export default config;