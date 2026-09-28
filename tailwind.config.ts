import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic theme tokens (Clubhouse / Sunlight). Values live in app/globals.css.
        og: {
          "bg": "rgb(var(--og-bg) / <alpha-value>)",
          "surface": "rgb(var(--og-surface) / <alpha-value>)",
          "raised": "rgb(var(--og-raised) / <alpha-value>)",
          "primary": "rgb(var(--og-primary) / <alpha-value>)",
          "on-primary": "rgb(var(--og-on-primary) / <alpha-value>)",
          "accent": "rgb(var(--og-accent) / <alpha-value>)",
          "accent-hover": "rgb(var(--og-accent-hover) / <alpha-value>)",
          "on-accent": "rgb(var(--og-on-accent) / <alpha-value>)",
          "accent-text": "rgb(var(--og-accent-text) / <alpha-value>)",
          "accent-line": "rgb(var(--og-accent-line) / <alpha-value>)",
          "text": "rgb(var(--og-text) / <alpha-value>)",
          "muted": "rgb(var(--og-muted) / <alpha-value>)",
          "border": "rgb(var(--og-border) / <alpha-value>)",
          "divider": "rgb(var(--og-divider) / <alpha-value>)",
          "success": "rgb(var(--og-success) / <alpha-value>)",
          "danger": "rgb(var(--og-danger) / <alpha-value>)",
          "on-danger": "rgb(var(--og-on-danger) / <alpha-value>)",
          "live": "rgb(var(--og-live) / <alpha-value>)",
          "disabled-bg": "rgb(var(--og-disabled-bg) / <alpha-value>)",
          "disabled-text": "rgb(var(--og-disabled-text) / <alpha-value>)",
          "disabled-border": "rgb(var(--og-disabled-border) / <alpha-value>)",
          "plus-border": "rgb(var(--og-plus-border) / <alpha-value>)",
          "chip": "rgb(var(--og-chip) / <alpha-value>)",
          "chip-border": "rgb(var(--og-chip-border) / <alpha-value>)",
          "chip-selected-border": "rgb(var(--og-chip-selected-border) / <alpha-value>)",
          "now-bg": "rgb(var(--og-now-bg) / <alpha-value>)",
          "par-pill": "rgb(var(--og-par-pill) / <alpha-value>)",
          "on-par-pill": "rgb(var(--og-on-par-pill) / <alpha-value>)",
          "penalty-border": "rgb(var(--og-penalty-border) / <alpha-value>)",
          "total-bg": "rgb(var(--og-total-bg) / <alpha-value>)",
          "total-text": "rgb(var(--og-total-text) / <alpha-value>)",
          "total-label": "rgb(var(--og-total-label) / <alpha-value>)",
          "total-danger": "rgb(var(--og-total-danger) / <alpha-value>)",
          "total-success": "rgb(var(--og-total-success) / <alpha-value>)",
          "total-sub": "rgb(var(--og-total-sub) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
