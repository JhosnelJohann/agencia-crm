import type { Config } from "tailwindcss";

/**
 * Identidad visual = la de sandrogozz.com (assets/css/style.css de la landing).
 * Oscuro cinematográfico: carbón cálido + un solo acento naranja (~3% de la superficie).
 *
 * 🔴 La app es SOLO oscura. Los tokens "light" (bg.light, bg.canvas, bg.surface…) apuntan a los
 * mismos valores oscuros a propósito: así las pantallas escritas "claro primero" heredan la
 * marca sin reescribirse una a una.
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  // Híbrido: `<html>` lleva siempre `.dark`, pero el contenido de página (`.app-main`) es CLARO.
  // Con `darkMode: "class"` las 761 utilidades `dark:` (text-white, border-white/10, bg-white/5…)
  // se aplicaban también dentro de `.app-main` → texto y bordes blancos sobre blanco. Ahora `dark:`
  // solo rige fuera de `.app-main` (dock, navbar, modales en portal) y en las islas oscuras dentro
  // de él (`.modal-surface`, `.dark-island`); en el contenido gana la clase base "claro primero".
  darkMode: [
    "variant",
    [
      "&:is(.dark *):not(.app-main *)",
      "&:is(.app-main .modal-surface, .app-main .modal-surface *)",
      "&:is(.app-main .dark-island, .app-main .dark-island *)"
    ]
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "#e8581a",
          primary: "#e8581a",
          primaryDark: "#b8460f",
          gold: "#b8460f",
          blue: "#5d8fa8",
          green: "#16b91a",
          red: "#e30b0b",
          neutral: "#94a3b8"
        },
        // Los "neón" eran decorativos; se reducen a tonos de la misma familia cálida.
        neon: {
          orange: "#e8581a",
          cyan: "#f0a070",
          magenta: "#e8581a",
          purple: "#c96a3d",
          blue: "#94a3b8",
          yellow: "#f0b040"
        },
        // bg.dark/darkcard, ink.* y line.* están detrás de variables CSS (ver :root y .app-main en
        // globals.css) para poder "voltear" el contenido de las páginas a modo claro sin tocar cada
        // componente — Sidebar/Topbar/.modal-surface siguen oscuros porque viven fuera de `.app-main`.
        bg: {
          // Variables (no hex fijo): oscuras en :root, claras dentro de .app-main (globals.css).
          light: "var(--bg-light)",
          canvas: "var(--bg-canvas)",
          surface: "var(--bg-surface)",
          "surface-2": "var(--bg-surface-2)",
          accent: "var(--bg-accent)",
          dark: "var(--bg-dark)",
          dark2: "#0f172a",
          darkcard: "var(--bg-dark-card)",
          sidebar: "#0b1120"
        },
        // Tokens de la landing, por nombre (para código nuevo).
        ink: {
          DEFAULT: "var(--ink)",
          sub: "var(--ink-sub)",
          muted: "var(--ink-muted)"
        },
        line: {
          DEFAULT: "var(--line)",
          soft: "var(--line-soft)",
          accent: "rgba(232,88,26,0.25)"
        }
      },
      fontFamily: {
        // Titulares: Barlow Condensed (mayúsculas, peso 700–800). Cuerpo: DM Sans.
        display: ["var(--font-barlow)", "sans-serif"],
        sans: ["var(--font-dm)", "sans-serif"],
        inter: ["var(--font-dm)", "sans-serif"],
        space: ["var(--font-barlow)", "sans-serif"],
        ui: ["var(--font-barlow)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"]
      },
      fontSize: {
        "display-xl": ["6rem", { lineHeight: "1", letterSpacing: "0.5px" }],
        "display-lg": ["4.5rem", { lineHeight: "1.02", letterSpacing: "0.5px" }],
        "display-md": ["3.5rem", { lineHeight: "1.02", letterSpacing: "0.5px" }],
        "h1": ["2.5rem", { lineHeight: "1.05", letterSpacing: "0.5px" }],
        "h2": ["2rem", { lineHeight: "1.1", letterSpacing: "0.5px" }],
        "h3": ["1.5rem", { lineHeight: "1.2", letterSpacing: "0.4px" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6" }],
        "eyebrow": ["0.78rem", { lineHeight: "1", letterSpacing: "0.24em" }]
      },
      boxShadow: {
        glow: "0 8px 30px -8px rgba(232,88,26,0.55)",
        "glow-lg": "0 14px 40px -8px rgba(232,88,26,0.7)",
        "glow-neon": "0 0 40px rgba(232,88,26,0.35)",
        glass: "0 30px 70px -30px rgba(0,0,0,0.55), 0 0 0 1px rgba(232,88,26,0.08)",
        "glass-dark": "0 30px 70px -30px rgba(0,0,0,0.6), 0 0 0 1px rgba(232,88,26,0.08)",
        // La landing no usa sombras en tarjetas, solo bordes: se neutralizan.
        "card-light": "none",
        "card-light-hover": "0 0 0 1px rgba(232,88,26,0.25)",
        "glass-light": "0 30px 70px -30px rgba(0,0,0,0.55), 0 0 0 1px rgba(232,88,26,0.08)"
      },
      borderRadius: {
        xl2: "1rem"
      },
      transitionTimingFunction: {
        landing: "cubic-bezier(0.16, 1, 0.3, 1)"
      },
      animation: {
        "shimmer": "shimmer 2s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "aurora-spin": "aurora-spin 20s linear infinite",
        "fade-in": "fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
      }
    }
  },
  plugins: []
};
export default config;
