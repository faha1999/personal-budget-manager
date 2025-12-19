// TODO: Centralize theme tokens (colors, spacing, typography) for Tailwind extension.
/**
 * Central theme tokens (light-mode first).
 * We’ll map these into CSS variables in globals.css.
 *
 * Palette goal:
 * - Premium, calm, modern.
 * - Dark ink text, subtle borders, soft surfaces, crisp primary accent.
 */
export const theme = {
  colors: {
    // surfaces
    background: "#0B1220", // used in gradients only; page background stays light
    canvas: "#FFFFFF",
    surface: "#F8FAFC",
    surface2: "#F1F5F9",

    // text
    text: "#0F172A",
    muted: "#475569",

    // borders
    border: "#E2E8F0",

    // accents
    primary: "#2563EB", // premium blue
    primary2: "#0EA5E9", // sky accent
    success: "#16A34A",
    warning: "#F59E0B",
    danger: "#EF4444",
  },

  radius: {
    card: "16px",
    button: "12px",
    input: "12px",
  },

  shadow: {
    card: "0 10px 30px rgba(2, 6, 23, 0.08)",
    soft: "0 6px 20px rgba(2, 6, 23, 0.06)",
  },
} as const;

export type Theme = typeof theme;
