// Lumina Auth theme tokens — Dark Mode Luxury Vault.
export const colors = {
  base: "#050505",
  surface: "#121214",
  surfaceGlass: "rgba(255, 255, 255, 0.05)",
  surfaceHighlight: "rgba(255, 255, 255, 0.10)",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255, 255, 255, 0.65)",
  textMuted: "rgba(255, 255, 255, 0.40)",
  monoAccent: "#00F0FF",
  primary: "#00F0FF",
  secondary: "#7B61FF",
  danger: "#FF3B30",
  warning: "#FF9F0A",
  success: "#34C759",
  glassBorder: "rgba(255, 255, 255, 0.12)",
  neonBorder: "rgba(0, 240, 255, 0.55)",
};

export const gradients = {
  timer: ["#00F0FF", "#7B61FF"] as const,
  cta: ["#00F0FF", "#7B61FF"] as const,
  danger: ["#FF3B30", "#FF9F0A"] as const,
  card: ["rgba(0, 240, 255, 0.08)", "rgba(123, 97, 255, 0.08)"] as const,
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const radii = { sm: 8, md: 16, lg: 20, xl: 24, xxl: 32, pill: 999 };

export const typography = {
  h1: { fontSize: 32, fontWeight: "700" as const, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: "700" as const, letterSpacing: -0.3 },
  h3: { fontSize: 20, fontWeight: "600" as const },
  body: { fontSize: 16, fontWeight: "400" as const },
  caption: { fontSize: 13, fontWeight: "500" as const },
  totp: {
    fontSize: 40,
    fontWeight: "700" as const,
    letterSpacing: 6,
    fontVariant: ["tabular-nums" as const],
  },
};
