import type { Theme, ThemePalette } from "./types";

export interface ThemePreset {
  id: string;
  name: string;
  /** preview swatches for the picker */
  swatches: string[];
  palettes: {
    light: ThemePalette;
    dark: ThemePalette;
  };
}

export const FONT_CHOICES = [
  { name: "Inter", family: "'Inter', system-ui, sans-serif" },
  { name: "Poppins", family: "'Poppins', system-ui, sans-serif" },
  { name: "DM Sans", family: "'DM Sans', system-ui, sans-serif" },
  { name: "Space Grotesk", family: "'Space Grotesk', system-ui, sans-serif" },
  { name: "Sora", family: "'Sora', system-ui, sans-serif" },
  { name: "Playfair Display", family: "'Playfair Display', Georgia, serif" },
  { name: "Merriweather", family: "'Merriweather', Georgia, serif" },
  { name: "JetBrains Mono", family: "'JetBrains Mono', monospace" },
] as const;

/** Google Fonts CSS URL for a family name. */
export function googleFontUrl(fontName: string): string {
  const slug = fontName.replace(/\s+/g, "+");
  return `https://fonts.googleapis.com/css2?family=${slug}:wght@400;500;600;700;800&display=swap`;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "minimal",
    name: "Minimal",
    swatches: ["#ffffff", "#18181b", "#6366f1"],
    palettes: {
      light: { accent: "#6366f1", surface: "#ffffff", text: "#18181b", muted: "#71717a" },
      dark: { accent: "#818cf8", surface: "#0a0a0a", text: "#fafafa", muted: "#a1a1aa" },
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    swatches: ["#fff7ed", "#7c2d12", "#f97316"],
    palettes: {
      light: { accent: "#f97316", surface: "#fff7ed", text: "#431407", muted: "#9a3412" },
      dark: { accent: "#fb923c", surface: "#1c0a02", text: "#ffedd5", muted: "#fdba74" },
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    swatches: ["#ecfeff", "#164e63", "#06b6d4"],
    palettes: {
      light: { accent: "#06b6d4", surface: "#ecfeff", text: "#083344", muted: "#0e7490" },
      dark: { accent: "#22d3ee", surface: "#04222b", text: "#cffafe", muted: "#67e8f9" },
    },
  },
  {
    id: "forest",
    name: "Forest",
    swatches: ["#f0fdf4", "#14532d", "#22c55e"],
    palettes: {
      light: { accent: "#22c55e", surface: "#f0fdf4", text: "#052e16", muted: "#166534" },
      dark: { accent: "#4ade80", surface: "#062814", text: "#dcfce7", muted: "#86efac" },
    },
  },
  {
    id: "royal",
    name: "Royal",
    swatches: ["#faf5ff", "#3b0764", "#a855f7"],
    palettes: {
      light: { accent: "#a855f7", surface: "#faf5ff", text: "#3b0764", muted: "#7e22ce" },
      dark: { accent: "#c084fc", surface: "#20063a", text: "#f5f3ff", muted: "#d8b4fe" },
    },
  },
  {
    id: "ink",
    name: "Ink",
    swatches: ["#fafafa", "#111827", "#111827"],
    palettes: {
      light: { accent: "#111827", surface: "#ffffff", text: "#111827", muted: "#6b7280" },
      dark: { accent: "#f9fafb", surface: "#030712", text: "#f9fafb", muted: "#9ca3af" },
    },
  },
];

export function findPreset(id: string): ThemePreset {
  return THEME_PRESETS.find((p) => p.id === id) ?? THEME_PRESETS[0]!;
}

/** Build a full Theme from a preset id + mode + optional overrides. */
export function themeFromPreset(id: string, mode: Theme["mode"], overrides?: Partial<Theme>): Theme {
  const preset = findPreset(id);
  const palette = preset.palettes[mode === "system" ? "light" : mode];
  return {
    preset: preset.id,
    fontFamily: overrides?.fontFamily ?? "Inter",
    mode,
    palette: overrides?.palette ?? palette,
  };
}

export function fontCssVar(theme: Theme): string {
  return FONT_CHOICES.find((f) => f.name === theme.fontFamily)?.family ?? FONT_CHOICES[0]!.family;
}