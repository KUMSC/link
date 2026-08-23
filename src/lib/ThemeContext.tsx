import { createContext, useContext, useEffect, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Theme } from "./types";
import { DEFAULT_THEME } from "./types";
import { fontBodyCssVar, fontHeadingCssVar, googleFontUrl } from "./themes";

interface ThemeContextValue {
  theme: Theme;
  cssVars: CSSProperties;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  cssVars: {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

const RADIUS_MAP: Record<string, { base: string; card: string; pill: string }> = {
  none: { base: "0px", card: "0px", pill: "0px" },
  sm: { base: "6px", card: "8px", pill: "9999px" },
  md: { base: "10px", card: "16px", pill: "9999px" },
  lg: { base: "16px", card: "24px", pill: "9999px" },
  full: { base: "20px", card: "32px", pill: "9999px" },
};

const BORDER_MAP: Record<string, string> = {
  hairline: "1px",
  thin: "1px",
  medium: "1.5px",
  thick: "2px",
};

const SHADOW_MAP: Record<string, string> = {
  none: "none",
  subtle: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  elevated: "0 12px 30px -8px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
  hard: "3px 3px 0px color-mix(in srgb, var(--text) 80%, black)",
};

/** Resolves a Theme into CSS variables applied to the nearest container. */
export function resolveThemeVars(theme: Theme): CSSProperties {
  const effectiveMode = theme.mode === "system" ? "light" : theme.mode;
  const radius = RADIUS_MAP[theme.radius || "sm"] ?? RADIUS_MAP.sm!;
  const borderWidth = BORDER_MAP[theme.borderWidth || "thin"] ?? "1px";
  const shadow = SHADOW_MAP[theme.shadow || "subtle"] ?? "none";

  const defaultPageBg =
    effectiveMode === "dark"
      ? "color-mix(in srgb, var(--surface) 92%, black)"
      : "color-mix(in srgb, var(--surface) 96%, #e5e7eb)";

  return {
    fontFamily: fontBodyCssVar(theme),
    "--font-heading": fontHeadingCssVar(theme),
    "--font-body": fontBodyCssVar(theme),
    "--radius": radius.base,
    "--card-radius": radius.card,
    "--border-width": borderWidth,
    "--card-shadow": shadow,
    "--accent": theme.palette.accent,
    "--surface": theme.palette.surface,
    "--text": theme.palette.text,
    "--muted": theme.palette.muted,
    "--page-bg": theme.palette.pageBg || defaultPageBg,
    colorScheme: effectiveMode,
  } as CSSProperties;
}

/**
 * Applies theme tokens as CSS variables and injects the chosen Google Fonts.
 * Wrap any subtree that should render with a theme (public page, admin preview).
 */
export function ThemeProvider({ theme, children }: { theme: Theme; children: ReactNode }) {
  const cssVars = useMemo(() => resolveThemeVars(theme), [theme]);

  useEffect(() => {
    const fonts = [theme.fontHeading, theme.fontBody].filter(
      (f): f is string => Boolean(f) && f !== "Inter",
    );
    const unique = [...new Set(fonts)];

    for (const fontName of unique) {
      const id = `gf-${fontName.replace(/\s+/g, "-")}`;
      if (document.getElementById(id)) continue;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = googleFontUrl(fontName);
      document.head.appendChild(link);
    }
  }, [theme.fontHeading, theme.fontBody]);

  const value = useMemo(() => ({ theme, cssVars }), [theme, cssVars]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}