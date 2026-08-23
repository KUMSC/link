import type { BorderWidth, RadiusPreset, ShadowPreset, Theme, ThemePalette } from "./types";

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  /** preview swatches for the picker */
  swatches: string[];
  defaults: {
    fontHeading: string;
    fontBody: string;
    radius: RadiusPreset;
    shadow: ShadowPreset;
    borderWidth: BorderWidth;
  };
  palettes: {
    light: ThemePalette;
    dark: ThemePalette;
  };
}

export const HEADING_FONT_CHOICES = [
  { name: "Space Grotesk", family: "'Space Grotesk', system-ui, sans-serif" },
  { name: "Syne", family: "'Syne', system-ui, sans-serif" },
  { name: "Playfair Display", family: "'Playfair Display', Georgia, serif" },
  { name: "Plus Jakarta Sans", family: "'Plus Jakarta Sans', system-ui, sans-serif" },
  { name: "Inter", family: "'Inter', system-ui, sans-serif" },
  { name: "Poppins", family: "'Poppins', system-ui, sans-serif" },
  { name: "Sora", family: "'Sora', system-ui, sans-serif" },
  { name: "JetBrains Mono", family: "'JetBrains Mono', monospace" },
  { name: "Merriweather", family: "'Merriweather', Georgia, serif" },
] as const;

export const BODY_FONT_CHOICES = [
  { name: "Inter", family: "'Inter', system-ui, sans-serif" },
  { name: "DM Sans", family: "'DM Sans', system-ui, sans-serif" },
  { name: "Plus Jakarta Sans", family: "'Plus Jakarta Sans', system-ui, sans-serif" },
  { name: "Poppins", family: "'Poppins', system-ui, sans-serif" },
  { name: "JetBrains Mono", family: "'JetBrains Mono', monospace" },
  { name: "Merriweather", family: "'Merriweather', Georgia, serif" },
] as const;

export const FONT_CHOICES = HEADING_FONT_CHOICES;

/** Google Fonts CSS URL for a family name. */
export function googleFontUrl(fontName: string): string {
  const slug = fontName.replace(/\s+/g, "+");
  return `https://fonts.googleapis.com/css2?family=${slug}:wght@400;500;600;700;800&display=swap`;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "swiss",
    name: "Swiss International",
    description: "Architectural, stark contrast, clean red accent, crisp grid.",
    swatches: ["#f8f9fa", "#09090b", "#e11d48"],
    defaults: {
      fontHeading: "Space Grotesk",
      fontBody: "Inter",
      radius: "sm",
      shadow: "none",
      borderWidth: "thin",
    },
    palettes: {
      light: { accent: "#e11d48", surface: "#ffffff", text: "#09090b", muted: "#71717a", pageBg: "#f8f9fa" },
      dark: { accent: "#f43f5e", surface: "#121215", text: "#f4f4f5", muted: "#a1a1aa", pageBg: "#09090b" },
    },
  },
  {
    id: "minimal",
    name: "Nordic Minimal",
    description: "Refined tech aesthetic, cobalt accent, smooth rounded cards.",
    swatches: ["#f8fafc", "#0f172a", "#4f46e5"],
    defaults: {
      fontHeading: "Inter",
      fontBody: "Inter",
      radius: "lg",
      shadow: "subtle",
      borderWidth: "hairline",
    },
    palettes: {
      light: { accent: "#4f46e5", surface: "#ffffff", text: "#0f172a", muted: "#64748b", pageBg: "#f8fafc" },
      dark: { accent: "#6366f1", surface: "#18181f", text: "#f8fafc", muted: "#94a3b8", pageBg: "#0c0d12" },
    },
  },
  {
    id: "brutal",
    name: "Neo-Brutalist",
    description: "Sharp corners, heavy 2px borders, solid hard shadows, high energy.",
    swatches: ["#f5f5f4", "#000000", "#facc15"],
    defaults: {
      fontHeading: "Space Grotesk",
      fontBody: "JetBrains Mono",
      radius: "none",
      shadow: "hard",
      borderWidth: "thick",
    },
    palettes: {
      light: { accent: "#000000", surface: "#ffffff", text: "#000000", muted: "#525252", pageBg: "#f5f5f4" },
      dark: { accent: "#facc15", surface: "#1c1917", text: "#fafaf9", muted: "#a8a29e", pageBg: "#0c0a09" },
    },
  },
  {
    id: "editorial",
    name: "Editorial Club",
    description: "Serif typography, warm cream paper tones, cultural aesthetic.",
    swatches: ["#f5f2eb", "#1c1917", "#854d0e"],
    defaults: {
      fontHeading: "Playfair Display",
      fontBody: "DM Sans",
      radius: "md",
      shadow: "subtle",
      borderWidth: "hairline",
    },
    palettes: {
      light: { accent: "#854d0e", surface: "#fcfbf9", text: "#1c1917", muted: "#78716c", pageBg: "#f5f2eb" },
      dark: { accent: "#eab308", surface: "#1c1917", text: "#f5f5f4", muted: "#a8a29e", pageBg: "#12100e" },
    },
  },
  {
    id: "sunset",
    name: "Solar Sunset",
    description: "Warm amber and terracotta, smooth pill corners, high readability.",
    swatches: ["#fff7ed", "#431407", "#ea580c"],
    defaults: {
      fontHeading: "Sora",
      fontBody: "Plus Jakarta Sans",
      radius: "lg",
      shadow: "subtle",
      borderWidth: "thin",
    },
    palettes: {
      light: { accent: "#ea580c", surface: "#ffffff", text: "#431407", muted: "#9a3412", pageBg: "#fff7ed" },
      dark: { accent: "#f97316", surface: "#1c120c", text: "#ffedd5", muted: "#fdba74", pageBg: "#0c0704" },
    },
  },
  {
    id: "ocean",
    name: "Deep Pacific",
    description: "Electric cyan and marine tones, super-rounded pill contours.",
    swatches: ["#f0f9ff", "#082f49", "#0284c7"],
    defaults: {
      fontHeading: "Plus Jakarta Sans",
      fontBody: "Inter",
      radius: "full",
      shadow: "subtle",
      borderWidth: "hairline",
    },
    palettes: {
      light: { accent: "#0284c7", surface: "#ffffff", text: "#082f49", muted: "#0369a1", pageBg: "#f0f9ff" },
      dark: { accent: "#38bdf8", surface: "#0a1926", text: "#f0f9ff", muted: "#7dd3fc", pageBg: "#030e17" },
    },
  },
  {
    id: "forest",
    name: "Botanic Forest",
    description: "Deep pine and vivid emerald, natural organic balance.",
    swatches: ["#f0fdf4", "#052e16", "#16a34a"],
    defaults: {
      fontHeading: "Poppins",
      fontBody: "DM Sans",
      radius: "md",
      shadow: "subtle",
      borderWidth: "thin",
    },
    palettes: {
      light: { accent: "#16a34a", surface: "#ffffff", text: "#052e16", muted: "#15803d", pageBg: "#f0fdf4" },
      dark: { accent: "#4ade80", surface: "#0a2313", text: "#f0fdf4", muted: "#86efac", pageBg: "#04140a" },
    },
  },
  {
    id: "ink",
    name: "Obsidian Ink",
    description: "Monochrome precision, stark grayscale, developer-first monospace.",
    swatches: ["#f4f4f5", "#09090b", "#09090b"],
    defaults: {
      fontHeading: "JetBrains Mono",
      fontBody: "Inter",
      radius: "sm",
      shadow: "none",
      borderWidth: "thin",
    },
    palettes: {
      light: { accent: "#09090b", surface: "#ffffff", text: "#09090b", muted: "#52525b", pageBg: "#f4f4f5" },
      dark: { accent: "#fafafa", surface: "#141416", text: "#fafafa", muted: "#a1a1aa", pageBg: "#09090b" },
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
    fontHeading: overrides?.fontHeading ?? preset.defaults.fontHeading,
    fontBody: overrides?.fontBody ?? preset.defaults.fontBody,
    radius: overrides?.radius ?? preset.defaults.radius,
    shadow: overrides?.shadow ?? preset.defaults.shadow,
    borderWidth: overrides?.borderWidth ?? preset.defaults.borderWidth,
    mode,
    palette: overrides?.palette ?? palette,
  };
}

export function fontHeadingCssVar(theme: Theme): string {
  const name = theme.fontHeading || theme.fontFamily || "Space Grotesk";
  return HEADING_FONT_CHOICES.find((f) => f.name === name)?.family ?? HEADING_FONT_CHOICES[0]!.family;
}

export function fontBodyCssVar(theme: Theme): string {
  const name = theme.fontBody || theme.fontFamily || "Inter";
  return BODY_FONT_CHOICES.find((f) => f.name === name)?.family ?? BODY_FONT_CHOICES[0]!.family;
}