import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        app: "rgb(var(--bg))",
        surface: "rgb(var(--surface))",
        "surface-2": "rgb(var(--surface-2))",
        ink: "rgb(var(--ink))",
        muted: "rgb(var(--muted))",
        subtle: "rgb(var(--subtle))",
        brand: "rgb(var(--brand))",
        "brand-2": "rgb(var(--brand-2))",
        "brand-3": "rgb(var(--brand-3))",
        border: "rgb(var(--border))",
      },
      boxShadow: {
        card: "var(--shadow)",
        "card-sm": "var(--shadow-sm)",
      },
      borderRadius: {
        xl: "var(--radius)",
      },
    },
  },
  plugins: [],
};

export default config;
